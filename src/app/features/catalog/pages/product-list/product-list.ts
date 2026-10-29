import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { KeyValuePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';

import { toApiError, type ApiError } from '../../../../core/api/api-error';
import type {
  Caffeine,
  CatalogPage,
  CatalogProduct,
  CatalogQuery,
  Category,
  Moment,
  ProductType,
} from '../../../../core/api/api.types';
import { CATALOG_RULES, TRANCHES_PRIX, type Sort } from '../../../../core/api/catalog-rules';
import { ProductsService } from '../../../../core/api/products.service';
import { UiButton } from '../../../../shared/ui/ui-button/ui-button';
import { UiProductCard } from '../../../../shared/ui/ui-product-card/ui-product-card';
import { badgeDe, momentDe } from '../../catalog-presentation';
import type { ChampFiltre, SectionUnivers } from '../../catalog.types';
import { CatalogFilters } from '../../components/catalog-filters/catalog-filters';
import { UniverseSection } from '../../components/universe-section/universe-section';

/** Produits montrés par univers dans la vue sans filtre, comme la maquette. */
const APERCU_PAR_UNIVERS = 4;

type Statut = 'chargement' | 'pret' | 'filtres-invalides' | 'echec';

/**
 * Catalogue (US-001) et ses filtres (US-016).
 *
 * Deux vues, celles de la maquette : sans filtre, les produits sont rangés par
 * univers avec un « Voir tout → » ; dès qu'un critère est posé, une grille
 * unique qui s'allonge par lots.
 *
 * Les filtres vivent dans les **paramètres de requête**, comme le demande
 * `docs/ARCHITECTURE.md` : une sélection se partage par copier-coller, le
 * retour arrière défait le dernier filtre, et recharger la page redonne le même
 * écran. L'URL est la seule source de vérité ; les composants de filtre ne
 * gardent aucun état.
 *
 * Conséquence voulue : une URL écrite à la main part telle quelle vers l'API,
 * qui est seule juge de ce qu'elle accepte.
 */
@Component({
  selector: 'app-product-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [KeyValuePipe, CatalogFilters, UiButton, UiProductCard, UniverseSection],
  templateUrl: './product-list.html',
  styleUrl: './product-list.scss',
})
export class ProductList {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly productsService = inject(ProductsService);

  /*
   * Les filtres arrivent par `withComponentInputBinding()` : un paramètre de
   * requête, une entrée. C'est la règle du dépôt (docs/ARCHITECTURE.md), et ça
   * rend visible, à la lecture du composant, tout ce que l'URL peut porter.
   *
   * Les valeurs ne sont ni validées ni corrigées ici : elles partent telles
   * quelles vers l'API, seule juge de ce qu'elle accepte.
   */
  readonly category = input<string | undefined>();
  readonly type = input<string | undefined>();
  readonly moment = input<string | undefined>();
  readonly caffeine = input<string | undefined>();
  readonly q = input<string | undefined>();
  readonly sort = input<string | undefined>();
  readonly minPriceCents = input<string | undefined>();
  readonly maxPriceCents = input<string | undefined>();
  readonly inStock = input<string | undefined>();

  /** Filtres lus dans l'URL, tels qu'ils partiront vers l'API. */
  protected readonly filtres = computed<CatalogQuery>(() => ({
    ...(this.category() === undefined ? {} : { category: this.category() }),
    ...(this.type() === undefined ? {} : { type: this.type() as ProductType }),
    ...(this.moment() === undefined ? {} : { moment: this.moment() as Moment }),
    ...(this.caffeine() === undefined ? {} : { caffeine: this.caffeine() as Caffeine }),
    ...(this.q() === undefined ? {} : { q: this.q() }),
    ...(this.sort() === undefined ? {} : { sort: this.sort() as Sort }),
    ...nombre('minPriceCents', this.minPriceCents()),
    ...nombre('maxPriceCents', this.maxPriceCents()),
    ...(this.inStock() === 'true' ? { inStock: true } : {}),
  }));

  protected readonly produits = signal<readonly CatalogProduct[]>([]);
  protected readonly statut = signal<Statut>('chargement');
  protected readonly erreur = signal<ApiError | null>(null);
  protected readonly total = signal(0);
  protected readonly chargeDavantage = signal(false);

  /** Tout le catalogue, hors filtres : sert aux sections et aux compteurs. */
  private readonly catalogue = signal<readonly CatalogProduct[]>([]);
  protected readonly categories = signal<readonly Category[]>([]);
  protected readonly totalCatalogue = signal(0);

  protected readonly aDesFiltres = computed(() => aDesCriteres(this.filtres()));
  protected readonly estVide = computed(
    () => this.statut() === 'pret' && this.produits().length === 0,
  );
  protected readonly resteDesProduits = computed(() => this.produits().length < this.total());

  protected readonly comptes = computed<Readonly<Record<string, number>>>(() => {
    const comptes: Record<string, number> = {};
    for (const produit of this.catalogue()) {
      comptes[produit.category.slug] = (comptes[produit.category.slug] ?? 0) + 1;
    }
    return comptes;
  });

  /** Univers qui ont au moins un produit : pas d'onglet qui mène au vide. */
  protected readonly universPeuples = computed(() =>
    this.categories().filter((categorie) => (this.comptes()[categorie.slug] ?? 0) > 0),
  );

  /** Vue sans filtre : chaque univers et ses premiers produits. */
  protected readonly sections = computed<readonly SectionUnivers[]>(() =>
    this.universPeuples().map((categorie) => {
      const produits = this.catalogue().filter((p) => p.category.slug === categorie.slug);
      return {
        categorie,
        produits: produits.slice(0, APERCU_PAR_UNIVERS),
        total: produits.length,
      };
    }),
  );

  protected readonly libelleMoment = momentDe;
  protected readonly mentionPhoto = badgeDe;

  constructor() {
    this.chargerCatalogue();

    effect(() => {
      // Dépend des filtres : toute modification de l'URL relance la requête.
      this.charger(this.filtres());
    });
  }

  /** Pose ou retire un critère. Les autres sont conservés, et on repart du premier lot. */
  protected appliquer({ champ, valeur }: { champ: ChampFiltre; valeur: string | null }): void {
    const modifications: Record<string, string | null> =
      champ === 'prix' ? bornesDeTranche(valeur) : { [champ]: valeur };

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { ...modifications, page: null },
      queryParamsHandling: 'merge',
    });
  }

  protected trier(sort: string): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { sort: sort === CATALOG_RULES.defaultSort ? null : sort, page: null },
      queryParamsHandling: 'merge',
    });
  }

  /** Retire tous les critères d'un coup, tri compris. */
  protected reinitialiser(): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams: {} });
  }

  /**
   * Charge le lot suivant et l'ajoute à ceux déjà affichés.
   *
   * Le lot est demandé par `page`, à `limit` constante, et les produits sont
   * concaténés dans l'ordre reçu : c'est ce qui garantit qu'aucun produit
   * n'est vu deux fois ni sauté d'un lot à l'autre.
   */
  protected voirPlus(): void {
    if (this.chargeDavantage() || !this.resteDesProduits()) return;

    const limit = this.filtres().limit ?? CATALOG_RULES.limit.default;
    const dejaVus = this.produits().length;
    this.chargeDavantage.set(true);

    this.productsService
      .list({ ...this.filtres(), page: Math.floor(dejaVus / limit) + 1, limit })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          this.produits.update((courants) => [...courants, ...page.data]);
          this.total.set(page.meta.total);
          this.chargeDavantage.set(false);
        },
        error: (erreur: unknown) => {
          // Le lot échoue : on garde ce qui est déjà affiché et on laisse
          // réessayer, plutôt que de vider la grille sous les yeux du visiteur.
          this.erreur.set(toApiError(erreur));
          this.chargeDavantage.set(false);
        },
      });
  }

  /** Relance la requête en cours après un échec de chargement. */
  protected reessayer(): void {
    this.charger(this.filtres());
    if (this.catalogue().length === 0) {
      this.chargerCatalogue();
    }
  }

  private charger(query: CatalogQuery): void {
    this.statut.set('chargement');
    this.erreur.set(null);

    this.productsService
      .list({ ...query, limit: query.limit ?? CATALOG_RULES.limit.default })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page: CatalogPage) => {
          this.produits.set(page.data);
          this.total.set(page.meta.total);
          this.statut.set('pret');
        },
        error: (erreur: unknown) => {
          // Garder à l'écran une liste qui ne correspond plus aux filtres
          // demandés serait un mensonge.
          this.produits.set([]);
          this.total.set(0);
          const apiError = toApiError(erreur);
          this.erreur.set(apiError);
          // Deux échecs, deux messages : des filtres refusés se corrigent en
          // changeant de filtre, une API muette se corrige en réessayant.
          this.statut.set(apiError.code === 'VALIDATION_ERROR' ? 'filtres-invalides' : 'echec');
        },
      });
  }

  /** Le catalogue entier, pour les sections par univers et les compteurs. */
  private chargerCatalogue(): void {
    this.productsService
      .list({ limit: CATALOG_RULES.limit.max })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          this.catalogue.set(page.data);
          this.totalCatalogue.set(page.meta.total);
        },
        error: () => {
          this.catalogue.set([]);
          this.totalCatalogue.set(0);
        },
      });

    this.productsService
      .categories()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        // Sans les catégories, les onglets disparaissent mais les pastilles et
        // la grille continuent de fonctionner : pas de quoi casser l'écran.
        next: (categories) => this.categories.set(categories),
        error: () => this.categories.set([]),
      });
  }
}

/**
 * Une borne de prix, si elle est bien un nombre.
 *
 * Un paramètre qui n'en est pas un est laissé de côté faute de pouvoir être
 * transmis — c'est la seule valeur que l'écran écarte de lui-même.
 */
function nombre(cle: string, brut: string | undefined): Record<string, number> {
  if (brut === undefined || brut.trim() === '') return {};
  const valeur = Number(brut);
  return Number.isFinite(valeur) ? { [cle]: valeur } : {};
}

/** Traduit la tranche choisie en les deux bornes que connaît le contrat. */
function bornesDeTranche(id: string | null): Record<string, string | null> {
  const tranche = TRANCHES_PRIX.find((candidate) => candidate.id === id);
  if (tranche === undefined) {
    return { minPriceCents: null, maxPriceCents: null };
  }
  return {
    minPriceCents: String(tranche.minPriceCents),
    maxPriceCents: tranche.maxPriceCents === undefined ? null : String(tranche.maxPriceCents),
  };
}

function aDesCriteres(filtres: CatalogQuery): boolean {
  const { sort: _sort, page: _page, limit: _limit, ...criteres } = filtres;
  return Object.values(criteres).some((valeur) => valeur !== undefined && valeur !== '');
}

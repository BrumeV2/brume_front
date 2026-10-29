import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { KeyValuePipe } from '@angular/common';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';

import type {
  Caffeine,
  CatalogProduct,
  CatalogQuery,
  Category,
  Moment,
  PageMeta,
  ProductType,
} from '../../../../core/api/api.types';
import { toApiError, type ApiError } from '../../../../core/api/api-error';
import { CATALOG_RULES, TRANCHES_PRIX, type Sort } from '../../../../core/api/catalog-rules';
import { ProductsService } from '../../../../core/api/products.service';
import type { ChampFiltre } from '../../catalog.types';
import { ProductCard } from '../../components/product-card/product-card';
import { ProductFilters } from '../../components/product-filters/product-filters';

type Statut = 'chargement' | 'pret' | 'erreur';

/**
 * Catalogue filtrable (US-016).
 *
 * Les filtres vivent dans les **paramètres de requête** : une sélection se
 * partage par copier-coller, le retour arrière défait le dernier filtre, et
 * recharger la page redonne le même écran. L'URL est donc la seule source de
 * vérité — les composants de filtre ne gardent aucun état de leur côté.
 *
 * Conséquence voulue : une URL trafiquée à la main (`?type=TISANE`) part telle
 * quelle vers l'API, qui la refuse, et l'écran affiche l'erreur au lieu de
 * corriger en silence une saisie qu'il n'a pas à interpréter.
 */
@Component({
  selector: 'app-product-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './product-list.html',
  styleUrl: './product-list.scss',
  imports: [KeyValuePipe, ProductCard, ProductFilters],
})
export class ProductList {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly productsService = inject(ProductsService);

  private readonly parametres = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  /** Filtres lus dans l'URL, tels qu'ils partiront vers l'API. */
  protected readonly filtres = computed<CatalogQuery>(() => lireFiltres(this.parametres()));

  protected readonly produits = signal<readonly CatalogProduct[]>([]);
  protected readonly meta = signal<PageMeta | null>(null);
  protected readonly statut = signal<Statut>('chargement');
  protected readonly erreur = signal<ApiError | null>(null);

  protected readonly categories = signal<readonly Category[]>([]);
  /** Nombre de produits par univers, hors filtres : les compteurs des onglets. */
  protected readonly comptes = signal<Readonly<Record<string, number>>>({});
  protected readonly totalCatalogue = signal(0);

  protected readonly total = computed(() => this.meta()?.total ?? 0);
  protected readonly aDesFiltres = computed(() => aDesCriteres(this.filtres()));
  protected readonly estVide = computed(
    () => this.statut() === 'pret' && this.produits().length === 0,
  );

  constructor() {
    this.chargerCategories();
    this.chargerComptes();

    effect(() => {
      // Dépend des filtres : toute modification de l'URL relance la requête.
      this.charger(this.filtres());
    });
  }

  /** Pose ou retire un critère. Les autres sont conservés, et on revient page 1. */
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

  /** Retire tous les critères d'un coup, y compris un tri non standard. */
  protected reinitialiser(): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams: {} });
  }

  private charger(query: CatalogQuery): void {
    this.statut.set('chargement');
    this.erreur.set(null);

    this.productsService
      .list(query)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          this.produits.set(page.data);
          this.meta.set(page.meta);
          this.statut.set('pret');
        },
        error: (erreur: unknown) => {
          // Les résultats précédents sont effacés : garder à l'écran une liste
          // qui ne correspond plus aux filtres demandés serait un mensonge.
          this.produits.set([]);
          this.meta.set(null);
          this.erreur.set(toApiError(erreur));
          this.statut.set('erreur');
        },
      });
  }

  private chargerCategories(): void {
    this.productsService
      .categories()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (categories) => this.categories.set(categories),
        // Sans les catégories, les onglets disparaissent mais les pastilles et
        // la grille continuent de fonctionner : pas de quoi casser l'écran.
        error: () => this.categories.set([]),
      });
  }

  /**
   * Compte les produits par univers en une requête sans filtre.
   *
   * À remplacer dès que `GET /categories` renvoie un compte par catégorie :
   * ramener tout le catalogue pour en faire la somme ne tiendra pas à l'échelle.
   */
  private chargerComptes(): void {
    this.productsService
      .list({ limit: CATALOG_RULES.limit.max })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          const comptes: Record<string, number> = {};
          for (const produit of page.data) {
            comptes[produit.category.slug] = (comptes[produit.category.slug] ?? 0) + 1;
          }
          this.comptes.set(comptes);
          this.totalCatalogue.set(page.meta.total);
        },
        error: () => {
          this.comptes.set({});
          this.totalCatalogue.set(0);
        },
      });
  }
}

/**
 * Lit les filtres de l'URL.
 *
 * Les valeurs inconnues ne sont **pas** écartées : elles partent à l'API, qui
 * est seule juge de ce qu'elle accepte. Seules les valeurs qui ne sont pas des
 * nombres sont laissées de côté, faute de pouvoir être transmises.
 */
function lireFiltres(parametres: { get(cle: string): string | null }): CatalogQuery {
  const texte = (cle: string): string | undefined => parametres.get(cle) ?? undefined;
  const entier = (cle: string): number | undefined => {
    const brut = parametres.get(cle);
    if (brut === null || brut.trim() === '') return undefined;
    const valeur = Number(brut);
    return Number.isFinite(valeur) ? valeur : undefined;
  };

  const filtres: CatalogQuery = {
    ...(texte('category') === undefined ? {} : { category: texte('category') }),
    ...(texte('type') === undefined ? {} : { type: texte('type') as ProductType }),
    ...(texte('moment') === undefined ? {} : { moment: texte('moment') as Moment }),
    ...(texte('caffeine') === undefined ? {} : { caffeine: texte('caffeine') as Caffeine }),
    ...(texte('q') === undefined ? {} : { q: texte('q') }),
    ...(texte('sort') === undefined ? {} : { sort: texte('sort') as Sort }),
    ...(entier('minPriceCents') === undefined ? {} : { minPriceCents: entier('minPriceCents') }),
    ...(entier('maxPriceCents') === undefined ? {} : { maxPriceCents: entier('maxPriceCents') }),
    ...(entier('page') === undefined ? {} : { page: entier('page') }),
    ...(parametres.get('inStock') === 'true' ? { inStock: true } : {}),
  };

  return filtres;
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
  const { sort, page, ...criteres } = filtres;
  return Object.values(criteres).some((valeur) => valeur !== undefined && valeur !== '');
}

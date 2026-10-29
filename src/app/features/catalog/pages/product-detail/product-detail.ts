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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import type { Params } from '@angular/router';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { toApiError, type ApiError } from '../../../../core/api/api-error';
import type { CatalogProduct } from '../../../../core/api/api.types';
import { ProductsService } from '../../../../core/api/products.service';
import { PricePipe } from '../../../../shared/pipes/price-pipe';
import { UiButton } from '../../../../shared/ui/ui-button/ui-button';
import { libelleDisponibilite, momentDe } from '../../catalog-presentation';

type Statut = 'chargement' | 'pret' | 'introuvable' | 'echec';

/**
 * Fiche produit, dans ce qu'elle a de minimal (critère 2 d'US-001 : « chaque
 * produit affiché permet d'ouvrir sa fiche sans perdre le contexte de
 * navigation »).
 *
 * Elle montre ce que la liste sait déjà, plus la disponibilité. Les formats, la
 * quantité, l'ajout au panier, les caractéristiques d'infusion et le profil que
 * dessine la maquette relèvent d'US-002 et d'US-004 : la mise en page à deux
 * colonnes est là pour qu'ils viennent s'y greffer sans la refaire.
 *
 * Le contexte de navigation voyage dans l'URL : les filtres du catalogue
 * suivent le lien de la carte et repartent avec le lien de retour. Un visiteur
 * qui arrive par un lien partagé retrouve donc la même liste en revenant,
 * et pas seulement celui qui utilise le bouton « précédent ».
 */
@Component({
  selector: 'app-product-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PricePipe, RouterLink, UiButton],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.scss',
})
export class ProductDetail {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly productsService = inject(ProductsService);
  private readonly titre = inject(Title);

  /** Lu dans le chemin, par `withComponentInputBinding()`. */
  readonly slug = input.required<string>();

  protected readonly produit = signal<CatalogProduct | null>(null);
  protected readonly statut = signal<Statut>('chargement');
  protected readonly erreur = signal<ApiError | null>(null);

  /** Filtres d'où vient le visiteur, à rendre au lien de retour. */
  protected readonly contexte = computed<Params>(() => {
    const params = this.route.snapshot.queryParams;
    const { ...filtres } = params;
    return filtres;
  });

  protected readonly libelleRetour = computed(() =>
    Object.keys(this.contexte()).length > 0 ? '← Retour aux résultats' : '← Toute la boutique',
  );

  protected readonly moment = computed(() => {
    const produit = this.produit();
    return produit === null ? null : momentDe(produit);
  });

  protected readonly disponibilite = computed(() => {
    const produit = this.produit();
    return produit === null ? null : libelleDisponibilite(produit.availability);
  });

  constructor() {
    effect(() => {
      this.charger(this.slug());
    });
  }

  protected reessayer(): void {
    this.charger(this.slug());
  }

  private charger(slug: string): void {
    this.statut.set('chargement');
    this.erreur.set(null);

    this.productsService
      .getBySlug(slug)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (produit) => {
          this.produit.set(produit);
          this.statut.set('pret');
          // Le `title` de la route ne connaît pas le produit : on le complète ici.
          this.titre.setTitle(`${produit.name} — Brume`);
        },
        error: (erreur: unknown) => {
          const apiError = toApiError(erreur);
          this.produit.set(null);
          this.erreur.set(apiError);
          // Un produit qui n'existe pas n'est pas une panne : on ne propose pas
          // de réessayer, on renvoie vers le catalogue.
          this.statut.set(apiError.statusCode === 404 ? 'introuvable' : 'echec');
        },
      });
  }
}

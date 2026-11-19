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
import type { CatalogProductDetail, Variant } from '../../../../core/api/api.types';
import { CART_RULES } from '../../../../core/api/cart-rules';
import { ProductsService } from '../../../../core/api/products.service';
import { CartStore, type AddRefusal, type CartLine } from '../../../../core/state/cart.store';
import { PricePipe } from '../../../../shared/pipes/price-pipe';
import { UiButton } from '../../../../shared/ui/ui-button/ui-button';
import { UiQuantity } from '../../../../shared/ui/ui-quantity/ui-quantity';
import { libelleDisponibilite, momentDe } from '../../catalog-presentation';

type Statut = 'chargement' | 'pret' | 'introuvable' | 'echec';

/** Où en est le dernier ajout au panier. */
type Ajout =
  | { readonly etat: 'repos' }
  | { readonly etat: 'envoi' }
  | { readonly etat: 'ajoute'; readonly ligne: CartLine; readonly quantite: number }
  | { readonly etat: 'refuse'; readonly refus: AddRefusal };

/**
 * Fiche produit (critère 2 d'US-001 : « chaque produit affiché permet d'ouvrir
 * sa fiche sans perdre le contexte de navigation »).
 *
 * Elle montre ce que la liste sait déjà, la disponibilité, et l'ajout au panier
 * d'US-021 : choix du format, quantité, puis confirmation de la ligne créée ou
 * restitution du refus de l'API. Les caractéristiques d'infusion et le profil
 * que dessine la maquette relèvent d'US-002 et d'US-004.
 *
 * Le contexte de navigation voyage dans l'URL : les filtres du catalogue
 * suivent le lien de la carte et repartent avec le lien de retour. Un visiteur
 * qui arrive par un lien partagé retrouve donc la même liste en revenant,
 * et pas seulement celui qui utilise le bouton « précédent ».
 */
@Component({
  selector: 'app-product-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PricePipe, RouterLink, UiButton, UiQuantity],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.scss',
})
export class ProductDetail {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly productsService = inject(ProductsService);
  private readonly titre = inject(Title);
  protected readonly panier = inject(CartStore);

  /** Lu dans le chemin, par `withComponentInputBinding()`. */
  readonly slug = input.required<string>();

  protected readonly produit = signal<CatalogProductDetail | null>(null);
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
    const variante = this.variante();
    const produit = this.produit();
    return libelleDisponibilite(variante?.availability ?? produit?.availability ?? 'IN_STOCK');
  });

  protected readonly quantiteMax = CART_RULES.quantity.max;
  private readonly varianteChoisie = signal<string | null>(null);
  protected readonly quantite = signal(1);
  protected readonly ajout = signal<Ajout>({ etat: 'repos' });

  /** Format choisi : celui du visiteur, sinon le premier format disponible. */
  protected readonly variante = computed<Variant | null>(() => {
    const variantes = this.produit()?.variants ?? [];
    const choisie = variantes.find((variante) => variante.id === this.varianteChoisie());
    return (
      choisie ??
      variantes.find((variante) => variante.availability !== 'OUT_OF_STOCK') ??
      variantes[0] ??
      null
    );
  });

  protected readonly confirmation = computed(() => {
    const ajout = this.ajout();
    return ajout.etat === 'ajoute' ? ajout : null;
  });

  /**
   * La ligne ajoutée telle qu'elle est **maintenant** dans le panier : modifiée
   * ou retirée depuis le tiroir, la confirmation suit au lieu de rester figée.
   */
  protected readonly ligneDansPanier = computed(() => {
    const confirmation = this.confirmation();
    if (confirmation === null) return null;
    return (
      this.panier.lines().find((ligne) => ligne.variantId === confirmation.ligne.variantId) ?? null
    );
  });

  protected readonly refus = computed(() => {
    const ajout = this.ajout();
    return ajout.etat === 'refuse' ? ajout.refus : null;
  });

  protected readonly estEpuisee = computed(() => this.variante()?.availability === 'OUT_OF_STOCK');

  constructor() {
    effect(() => {
      this.charger(this.slug());
    });
  }

  protected reessayer(): void {
    this.charger(this.slug());
  }

  protected choisir(variante: Variant): void {
    if (variante.id === this.variante()?.id) return;
    this.varianteChoisie.set(variante.id);
    this.quantite.set(1);
    this.ajout.set({ etat: 'repos' });
  }

  protected async ajouter(): Promise<void> {
    const produit = this.produit();
    const variante = this.variante();
    if (produit === null || variante === null || this.ajout().etat === 'envoi') return;

    const quantite = this.quantite();
    this.ajout.set({ etat: 'envoi' });
    const resultat = await this.panier.add(produit, variante, quantite);
    this.ajout.set(
      resultat.ok
        ? { etat: 'ajoute', ligne: resultat.line, quantite }
        : { etat: 'refuse', refus: resultat.refusal },
    );
    if (resultat.ok) this.quantite.set(1);
  }

  private charger(slug: string): void {
    this.statut.set('chargement');
    this.erreur.set(null);
    this.varianteChoisie.set(null);
    this.quantite.set(1);
    this.ajout.set({ etat: 'repos' });

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

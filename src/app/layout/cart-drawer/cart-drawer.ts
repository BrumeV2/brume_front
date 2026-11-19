import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { CART_RULES } from '../../core/api/cart-rules';
import { CartStore, type CartLine } from '../../core/state/cart.store';
import { PricePipe, formatCents } from '../../shared/pipes/price-pipe';
import { UiButton } from '../../shared/ui/ui-button/ui-button';
import { UiQuantity } from '../../shared/ui/ui-quantity/ui-quantity';

/** Ce que dit la mention sous le sous-total, selon la fiabilité du total (US-024). */
const MENTION_TOTAL = {
  confirmed: 'Taxes incluses · livraison et remises calculées à la commande',
  updating: 'Mise à jour du sous-total…',
  unconfirmed: 'Sous-total à confirmer : vérifie les lignes signalées.',
  unknown: 'Prix confirmés à la connexion : ton panier sera conservé et rattaché à ton compte.',
} as const;

/**
 * « Panier (tiroir) » et « Panier vide (tiroir) » de la maquette.
 *
 * - US-021 : état du panier après un ajout, dernière ligne mise en avant ;
 * - US-022 : quantité modifiable par ligne, total marqué « en cours » tant que
 *   l'API n'a pas répondu, refus affiché sur la ligne ;
 * - US-023 : « Retirer » par ligne, état vide, suppression en erreur ;
 * - US-024 : sous-total de l'API, livraison encore inconnue, total non confirmé ;
 * - US-025 : « Commander » relit le panier, présente les écarts et demande une
 *   nouvelle confirmation avant d'entrer dans la commande.
 *
 * `<dialog>` modal : piège du focus, Échap et arrière-plan inerte sont gérés
 * par le navigateur. L'ouverture est pilotée par `CartStore`, pour que la
 * fiche produit puisse l'ouvrir après un ajout.
 */
@Component({
  selector: 'app-cart-drawer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PricePipe, RouterLink, UiButton, UiQuantity],
  templateUrl: './cart-drawer.html',
  styleUrl: './cart-drawer.scss',
})
export class CartDrawer {
  protected readonly panier = inject(CartStore);
  private readonly router = inject(Router);

  private readonly tiroir = viewChild.required<ElementRef<HTMLDialogElement>>('tiroir');

  protected readonly quantiteMax = CART_RULES.quantity.max;
  protected readonly validationEnCours = signal(false);

  protected readonly mentionTotal = computed(() => MENTION_TOTAL[this.panier.totalState()]);

  /** Écarts à montrer après une validation : changements, ou problèmes à corriger. */
  protected readonly ecarts = computed(() => {
    const validation = this.panier.validation();
    return validation?.status === 'changed' || validation?.status === 'blocked' ? validation : null;
  });

  protected readonly messageValidation = computed(() => {
    const validation = this.panier.validation();
    switch (validation?.status) {
      case 'empty':
        return 'Ton panier est vide : ajoute un produit pour commander.';
      case 'busy':
        return 'Une modification est en cours : attends sa confirmation pour commander.';
      case 'error':
        return validation.message;
      default:
        return null;
    }
  });

  /**
   * « Commander · 53 € » comme sur la maquette, mais seulement avec un
   * sous-total confirmé ; après un changement, une confirmation explicite.
   */
  protected readonly libelleCommander = computed(() => {
    if (this.panier.validation()?.status === 'changed') return 'Confirmer et commander';
    const total = this.panier.itemsTotalCents();
    return this.panier.totalState() === 'confirmed' && total !== null
      ? `Commander · ${formatCents(total)}`
      : 'Commander';
  });

  constructor() {
    effect(() => {
      const dialog = this.tiroir().nativeElement;
      if (this.panier.isDrawerOpen()) {
        if (!dialog.open) dialog.showModal();
      } else if (dialog.open) {
        dialog.close();
      }
    });
  }

  /** Échap ou « Fermer » : le navigateur ferme le dialogue, le store doit le savoir. */
  protected surFermeture(): void {
    this.panier.closeDrawer();
  }

  protected fermer(): void {
    this.panier.closeDrawer();
  }

  /** Un clic sur le voile (hors du tiroir) le referme. */
  protected surClic(evenement: MouseEvent): void {
    if (evenement.target === this.tiroir().nativeElement) this.fermer();
  }

  protected changerQuantite(ligne: CartLine, quantite: number): void {
    void this.panier.setQuantity(ligne.variantId, quantite);
  }

  protected retirer(ligne: CartLine): void {
    void this.panier.remove(ligne.variantId);
  }

  protected async commander(): Promise<void> {
    if (this.validationEnCours()) return;
    this.validationEnCours.set(true);
    try {
      const resultat = await this.panier.validate();
      if (resultat.status === 'valid') {
        this.fermer();
        await this.router.navigateByUrl('/commande');
      } else if (resultat.status === 'login-required') {
        this.fermer();
        await this.router.navigateByUrl('/connexion');
      }
    } finally {
      this.validationEnCours.set(false);
    }
  }
}

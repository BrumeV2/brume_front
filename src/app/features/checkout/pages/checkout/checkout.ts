import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { CartStore } from '../../../../core/state/cart.store';
import { PricePipe } from '../../../../shared/pipes/price-pipe';
import { UiButton } from '../../../../shared/ui/ui-button/ui-button';

/** Les trois étapes de la maquette « Commande ». */
const ETAPES = [
  { numero: '01', titre: 'Tes coordonnées' },
  { numero: '02', titre: 'Livraison' },
  { numero: '03', titre: 'Paiement' },
] as const;

/**
 * Entrée dans la commande (US-025).
 *
 * À l'arrivée, le panier est relu sur l'API : on n'entre dans les étapes de
 * commande qu'avec un panier confirmé. Sinon, la page présente les écarts et
 * propose de corriger le panier puis de le confirmer de nouveau. Un panier
 * modifié pendant que la page est ouverte (depuis le tiroir) repasse aussi par
 * une confirmation.
 *
 * Coordonnées, livraison et paiement relèvent d'US-026 à US-035 : les étapes
 * sont annoncées, pas simulées. Le récapitulatif ne montre donc ni frais de
 * port ni total TTC, que seul `POST /checkout/quote` saura donner.
 */
@Component({
  selector: 'app-checkout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PricePipe, UiButton],
  templateUrl: './checkout.html',
  styleUrl: './checkout.scss',
})
export class Checkout {
  protected readonly panier = inject(CartStore);
  protected readonly etapes = ETAPES;
  protected readonly verification = signal(true);

  protected readonly validation = this.panier.validation;

  /** Écarts à montrer : changements à reconfirmer, ou problèmes à corriger. */
  protected readonly ecarts = computed(() => {
    const validation = this.validation();
    return validation?.status === 'changed' || validation?.status === 'blocked' ? validation : null;
  });

  constructor() {
    void this.confirmer();
  }

  protected async confirmer(): Promise<void> {
    this.verification.set(true);
    try {
      await this.panier.validate();
    } finally {
      this.verification.set(false);
    }
  }

  protected revoirPanier(): void {
    this.panier.openDrawer();
  }
}

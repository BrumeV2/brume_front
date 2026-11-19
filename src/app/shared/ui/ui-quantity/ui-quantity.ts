import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';

/**
 * Sélecteur de quantité de la maquette (« Quantité » : − 1 +), en pilule.
 *
 * La valeur reste toujours dans `[min, max]` : les boutons se désactivent aux
 * bornes plutôt que de laisser saisir une quantité que l'API refuserait.
 */
@Component({
  selector: 'app-ui-quantity',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ui-quantity.html',
  styleUrl: './ui-quantity.scss',
  host: { '[class.est-compacte]': 'taille() === "compacte"' },
})
export class UiQuantity {
  readonly valeur = model(1);
  readonly min = input(1);
  readonly max = input(99);
  readonly disabled = input(false);
  /** `compacte` : la pilule de 34 px des lignes du tiroir panier. */
  readonly taille = input<'normale' | 'compacte'>('normale');
  /** Ce que la quantité compte, pour les lecteurs d'écran : « Matcha cérémonie, Boîte 50 g ». */
  readonly objet = input('');

  protected readonly peutRetirer = computed(() => !this.disabled() && this.valeur() > this.min());
  protected readonly peutAjouter = computed(() => !this.disabled() && this.valeur() < this.max());

  protected retirer(): void {
    if (this.peutRetirer()) this.valeur.update((valeur) => valeur - 1);
  }

  protected ajouter(): void {
    if (this.peutAjouter()) this.valeur.update((valeur) => valeur + 1);
  }
}

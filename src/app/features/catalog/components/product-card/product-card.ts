import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

import type { CatalogProduct } from '../../../../core/api/api.types';
import { LIBELLES_MOMENT } from '../../../../core/api/catalog-rules';

const EURO = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

/**
 * Carte de la grille (composant Figma « Carte produit », photo au format 4:5).
 *
 * Présentationnelle : elle reçoit un produit et n'injecte aucun service.
 */
@Component({
  selector: 'app-product-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './product-card.html',
  styleUrl: './product-card.scss',
})
export class ProductCard {
  readonly produit = input.required<CatalogProduct>();

  /**
   * Les URL d'images du contrat pointent vers un CDN qui n'existe pas encore :
   * on bascule sur un aplat plutôt que de laisser une image cassée.
   */
  protected readonly imageEnEchec = signal(false);

  protected readonly prix = computed(() => EURO.format(this.produit().fromPriceCents / 100));

  protected readonly moment = computed(() => LIBELLES_MOMENT[this.produit().moment]);

  /** Mention portée par la photo : rupture d'abord, réservation d'âge ensuite. */
  protected readonly badge = computed<string | null>(() => {
    const produit = this.produit();
    if (produit.availability === 'OUT_OF_STOCK') return 'Épuisé';
    if (produit.availability === 'LOW_STOCK') return 'Derniers exemplaires';
    if (produit.ageRestricted) return '18 ans et +';
    return null;
  });

  /** Initiales affichées sur l'aplat de repli, faute de photo. */
  protected readonly monogramme = computed(() =>
    this.produit()
      .name.split(' ')
      .slice(0, 2)
      .map((mot) => mot.charAt(0))
      .join('')
      .toUpperCase(),
  );
}

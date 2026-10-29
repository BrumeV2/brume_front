import type { CatalogProduct } from '../../core/api/api.types';
import { LIBELLES_MOMENT } from '../../core/api/catalog-rules';

/**
 * Traduit un produit du contrat vers ce qu'affiche `app-ui-product-card`.
 *
 * Le composant partagé ne connaît aucun type de l'API : c'est ici que le
 * catalogue fait la conversion, au même endroit pour la vue par univers et
 * pour la grille filtrée.
 */

export function momentDe(produit: CatalogProduct): string {
  return LIBELLES_MOMENT[produit.moment];
}

/**
 * Mention portée par la photo.
 *
 * La disponibilité passe avant la mention éditoriale : savoir qu'un produit
 * est épuisé compte plus que de lire « Nouveau » dessus.
 */
export function badgeDe(produit: CatalogProduct): string | null {
  if (produit.availability === 'OUT_OF_STOCK') return 'Épuisé';
  if (produit.availability === 'LOW_STOCK') return 'Derniers exemplaires';
  return produit.badge;
}

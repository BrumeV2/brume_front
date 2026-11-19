/**
 * Règles du panier tirées du contrat (`openapi.yaml` de brume_back).
 *
 * `quantity` est bornée de 1 à 99 sur `AddCartItemRequest` comme sur
 * `CartItem` : une ligne ne peut donc pas dépasser 99, ajouts cumulés compris.
 */
export const CART_RULES = {
  quantity: { min: 1, max: 99 },
  /** `MergeCartRequest.items.maxItems`. */
  mergeMaxItems: 50,
} as const;

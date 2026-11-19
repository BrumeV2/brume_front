/**
 * Formes du catalogue servies par l'API, extraites du contrat.
 *
 * Le catalogue a son propre jeu de schémas, `Catalogue*`, auquel
 * `GET /products` et `GET /products/{id}` renvoient. `ProductSummary` et
 * `ProductDetail`, qui cohabitent dans le même `openapi.yaml`, viennent du
 * cadrage initial et ne sont plus référencés par aucune route : les lire comme
 * le contrat du catalogue mène à décrire une API qui n'existe pas.
 *
 * Comme partout ailleurs, la source de vérité est `schema.d.ts`. Ces alias ne
 * sont là que pour nommer les formes de l'API côté traducteur, et les
 * distinguer du modèle de l'écran.
 */

import type { components } from './schema';

/** Niveaux de caféine de l'API, en minuscules. */
export type CaffeineApi = components['schemas']['CatalogueProductDetail']['howMuchCaffeine'];

/** Moments de l'API. `snack` est le « Goûter » de la maquette. */
export type MomentApi = components['schemas']['CatalogueProduct']['moment'];

/** Un produit tel que `GET /products` le renvoie. */
export type ProduitApi = components['schemas']['CatalogueProduct'];

/** Une page de catalogue : les produits et le total après filtrage. */
export type PageApi = components['schemas']['CataloguePage'];

/** Un format vendable, l'équivalent de la « variante » du cadrage initial. */
export type FormatApi = components['schemas']['CatalogueFormat'];

/** Un ingrédient tel que la fiche le détaille. */
export type IngredientApi = components['schemas']['CatalogueProductDetail']['ingredients'][number];

/** Une fiche telle que `GET /products/{id}` la renvoie. L'identifiant est un UUID. */
export type FicheApi = components['schemas']['CatalogueProductDetail'];

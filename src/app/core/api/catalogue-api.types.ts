/* ─────────────────────────────────────────────────────────────────────────
 * Ce que l'API sert RÉELLEMENT sur le catalogue.
 *
 * Ces types sont écrits à la main, à rebours de la règle du dépôt, et c'est
 * volontaire : ils ne peuvent pas être extraits de `schema.d.ts`, parce que
 * l'implémentation du back ne sert pas le contrat qu'elle publie.
 *
 * `openapi.yaml` 1.3.0 déclare un `ProductSummary` avec `slug`, `category`,
 * `type`, `shortDescription`, `fromPriceCents`, `image: { url, alt }` et
 * `ageRestricted`. Mesuré sur la pile locale au 19/11/2026, `GET /products`
 * n'en sert aucun : il renvoie les champs ci-dessous. De même, la fiche est
 * `GET /products/{id}` en UUID — `GET /products/{slug}` répond 400 — et ses
 * formats s'appellent `formats`, pas `variants`.
 *
 * `GET /categories` répond 404 : les univers de la maquette n'ont aucune
 * donnée derrière.
 *
 * Tant que le back n'est pas revenu à son contrat, `ProductsHttpService`
 * traduit ces formes vers le modèle de l'écran. Le jour où il s'y conforme,
 * ce fichier et le traducteur disparaissent ensemble.
 * ───────────────────────────────────────────────────────────────────────── */

import type { Availability, PageMeta } from './api.types';

/** Niveaux de caféine de l'API, en minuscules. */
export type CaffeineApi = 'none' | 'low' | 'medium' | 'high';

/** Moments de l'API. `snack` est le « Goûter » de la maquette. */
export type MomentApi = 'morning' | 'noon' | 'snack' | 'evening';

/** Un produit tel que `GET /products` le renvoie. */
export interface ProduitApi {
  readonly id: string;
  readonly name: string;
  readonly typeTea: string | null;
  readonly origin: string | null;
  readonly availability: Availability;
  /** Commandable pour une unité au moment de la consultation (US-004). */
  readonly isOrderable: boolean;
  /** Noms des ingrédients, la base en premier. */
  readonly ingredients: readonly string[];
  readonly moment: MomentApi;
  /** Image en `data:` URI, base64, ou `null`. */
  readonly image: string | null;
  /** Prix du format le moins cher, en centimes. `null` si aucun format. */
  readonly lowestPrice: number | null;
  readonly averageRating: number | null;
  readonly ratingCount: number;
}

export interface PageApi {
  readonly data: readonly ProduitApi[];
  readonly meta: PageMeta;
}

/** Un format vendable, l'équivalent de la « variante » du contrat. */
export interface FormatApi {
  readonly id: string;
  readonly packaging: string;
  readonly quantity: number;
  /** En centimes. */
  readonly price: number;
  readonly stock: number;
  readonly availability: Availability;
  readonly isOrderable: boolean;
}

export interface IngredientApi {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly type: string;
}

/** Une fiche telle que `GET /products/{id}` la renvoie. */
export interface FicheApi extends Omit<ProduitApi, 'ingredients' | 'lowestPrice'> {
  readonly description: string | null;
  readonly howMuchCaffeine: CaffeineApi;
  readonly ingredients: readonly IngredientApi[];
  readonly formats: readonly FormatApi[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

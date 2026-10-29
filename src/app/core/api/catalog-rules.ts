import type { Caffeine, Moment, ProductType } from './api.types';

/**
 * Valeurs acceptées par les filtres du catalogue, au même endroit pour tout le
 * monde : la barre de filtres construit ses menus avec, et l'implémentation
 * simulée refuse tout ce qui n'y figure pas — comme le ferait le `ValidationPipe`
 * du back sur `GET /products`.
 *
 * Les bornes reprennent `openapi.yaml` (`listProducts`). Les deux derniers
 * groupes sont hors contrat : voir le bloc du même nom dans `api.types.ts`.
 */

export const PRODUCT_TYPES = [
  'TEA',
  'COFFEE',
  'CBD',
  'BOX',
  'ADVENT_CALENDAR',
  'ACCESSORY',
] as const satisfies readonly ProductType[];

export const SORTS = ['relevance', 'price_asc', 'price_desc', 'newest', 'name_asc'] as const;

export type Sort = (typeof SORTS)[number];

export const MOMENTS = [
  'MORNING',
  'NOON',
  'AFTERNOON',
  'EVENING',
] as const satisfies readonly Moment[];

export const CAFFEINES = ['NONE', 'LOW', 'MEDIUM', 'HIGH'] as const satisfies readonly Caffeine[];

export const CATALOG_RULES = {
  /** `sort` vaut `relevance` par défaut, comme le déclare le contrat. */
  defaultSort: 'relevance' satisfies Sort,
  page: { min: 1, default: 1 },
  // 8 par lot : deux rangées de quatre sur ordinateur, quatre de deux sur mobile.
  limit: { min: 1, max: 100, default: 8 },
  price: { min: 0 },
  q: { maxLength: 100 },
} as const;

/** Libellés français, pour n'avoir qu'un seul endroit à traduire. */
export const LIBELLES_TYPE: Readonly<Record<ProductType, string>> = {
  TEA: 'Thé',
  COFFEE: 'Café',
  CBD: 'CBD',
  BOX: 'Box & coffrets',
  ADVENT_CALENDAR: "Calendrier de l'Avent",
  ACCESSORY: 'Accessoire',
};

export const LIBELLES_SORT: Readonly<Record<Sort, string>> = {
  relevance: 'Les préférés',
  price_asc: 'Prix croissant',
  price_desc: 'Prix décroissant',
  newest: 'Nouveautés',
  name_asc: 'Ordre alphabétique',
};

/** Libellés de la maquette, déjà employés par la vitrine de l'accueil. */
export const LIBELLES_MOMENT: Readonly<Record<Moment, string>> = {
  MORNING: 'Matin',
  NOON: 'Midi',
  AFTERNOON: 'Goûter',
  EVENING: 'Soir',
};

export const LIBELLES_CAFFEINE: Readonly<Record<Caffeine, string>> = {
  NONE: 'Sans caféine',
  LOW: 'Peu caféiné',
  MEDIUM: 'Modéré',
  HIGH: 'Corsé',
};

/**
 * Tranches de prix de la pastille « Prix ». Les bornes sont en centimes, comme
 * tout montant qui circule entre le front et l'API.
 */
export const TRANCHES_PRIX = [
  { id: 'moins-de-15', libelle: 'Moins de 15 €', minPriceCents: 0, maxPriceCents: 1499 },
  { id: '15-a-25', libelle: '15 à 25 €', minPriceCents: 1500, maxPriceCents: 2500 },
  { id: 'plus-de-25', libelle: 'Plus de 25 €', minPriceCents: 2501, maxPriceCents: undefined },
] as const;

export type TranchePrix = (typeof TRANCHES_PRIX)[number];

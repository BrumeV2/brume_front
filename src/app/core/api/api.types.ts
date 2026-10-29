/**
 * Alias lisibles des types du contrat d'API.
 *
 * La source de vérité est `schema.d.ts`, généré depuis `openapi.yaml` de `brume_back` :
 *
 * ```bash
 * npx openapi-typescript@7 ../brume_back/docs/contract/openapi.yaml -o src/app/core/api/schema.d.ts
 * ```
 *
 * On n'écrit jamais un type d'API à la main : on l'extrait d'ici.
 */
import type { components, operations } from './schema';

export type User = components['schemas']['User'];
export type Role = components['schemas']['Role'];
export type UpdateProfileRequest = components['schemas']['UpdateProfileRequest'];
export type Address = components['schemas']['Address'];
export type AddressInput = components['schemas']['AddressInput'];
export type PageMeta = components['schemas']['PageMeta'];

export type Category = components['schemas']['Category'];
export type CategoryRef = components['schemas']['CategoryRef'];
export type ProductSummary = components['schemas']['ProductSummary'];
export type ProductType = components['schemas']['ProductType'];
export type Availability = components['schemas']['Availability'];

/** Paramètres acceptés par `GET /products`, tels que le contrat les déclare. */
export type ProductQuery = NonNullable<operations['listProducts']['parameters']['query']>;

/* ─────────────────────────────────────────────────────────────────────────
 * HORS CONTRAT — champs présents dans la maquette mais absents de
 * `openapi.yaml` (branche `develop` de brume_back) au 27/10/2026.
 *
 * La connexion passe par Google, seul fournisseur d'identité.
 * L'email et la photo viennent du fournisseur et ne se modifient pas depuis
 * Brume ; le prénom et le nom en viennent aussi mais restent corrigeables,
 * puisqu'ils servent de destinataire des colis (écran « Profil client — mobile »).
 *
 * Seule la date de naissance est propre à Brume et absente du contrat.
 *
 * À faire ajouter au contrat côté back. Tant que ce n'est pas fait, seule
 * l'implémentation simulée connaît ces champs.
 * ───────────────────────────────────────────────────────────────────────── */

export interface ProfileExtensions {
  /** Date de naissance au format `YYYY-MM-DD`. Facultative (majorité CBD, D-002). */
  birthDate: string | null;
  /** Photo de profil fournie par le fournisseur d'identité. */
  avatarUrl: string | null;
}

/** Profil tel que l'écran « Mon profil » l'affiche. */
export type UserProfile = User & ProfileExtensions;

/** Corps d'une modification de profil : champs du contrat + extensions. */
export type UpdateProfileDraft = UpdateProfileRequest &
  Partial<Omit<ProfileExtensions, 'avatarUrl'>>;

/* ─────────────────────────────────────────────────────────────────────────
 * HORS CONTRAT — ce que la maquette du catalogue montre et que
 * `openapi.yaml` (branche `develop` de brume_back) ne porte pas, au 29/10/2026.
 *
 * La carte produit affiche une origine, des notes de dégustation, un moment de
 * la journée et une mention éditoriale ; la barre de filtres ajoute aux filtres
 * du contrat une pastille « Moment » et une pastille « Caféine ».
 *
 * `origin` existe bien au contrat, mais sur `ProductDetail` seulement : la
 * liste ne le renvoie pas, alors que la carte l'affiche. `attributes.caffeine`
 * est dans le seed et dans `ProductDetail`, sans être interrogeable. Les deux
 * autres n'existent nulle part.
 *
 * À faire ajouter au contrat : `moment` et `caffeine` en paramètres de
 * `GET /products`, et les quatre champs sur `ProductSummary`. Tant que ce
 * n'est pas fait, seule l'implémentation simulée les connaît, et
 * `ProductsHttpService` laisse les deux filtres de côté plutôt que d'envoyer
 * au back des paramètres qu'il rejetterait.
 * ───────────────────────────────────────────────────────────────────────── */

/**
 * Moment de la journée conseillé, affiché sur la carte produit. Les quatre
 * moments sont ceux de « Une tasse pour chaque heure » sur l'accueil :
 * 8 h, 12 h, 16 h, 21 h.
 */
export type Moment = 'MORNING' | 'NOON' | 'AFTERNOON' | 'EVENING';

/** Teneur en caféine. Reprend les valeurs de `attributes.caffeine` du seed. */
export type Caffeine = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';

export interface ProductExtensions {
  moment: Moment;
  caffeine: Caffeine;
  /** Origine, affichée en petites capitales : « Vert · Uji, Japon ». */
  origin: string | null;
  /** Notes de dégustation : « Herbacé · crémeux · umami ». */
  tastingNotes: string | null;
  /** Mention éditoriale sur la photo : « Préféré », « Nouveau », « Rare ». */
  badge: string | null;
}

/** Produit tel que la grille du catalogue l'affiche. */
export type CatalogProduct = ProductSummary & ProductExtensions;

/** Filtres hors contrat, ajoutés à ceux de `GET /products`. */
export interface ProductQueryExtensions {
  moment: Moment;
  caffeine: Caffeine;
}

/** Jeu complet de filtres manipulé par l'écran. */
export type CatalogQuery = ProductQuery & Partial<ProductQueryExtensions>;

/** Page de produits renvoyée au catalogue. */
export interface CatalogPage {
  data: CatalogProduct[];
  meta: PageMeta;
}

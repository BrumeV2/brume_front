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
import type { components } from './schema';

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

/*
 * Filtres de `GET /products` tels que le catalogue les envoie aujourd'hui.
 *
 * Seul type d'API écrit à la main, et seulement parce qu'il est **gelé** : le
 * contrat de `GET /products` a changé avec US-016 côté back (`ingredients`,
 * `origin`, `typeTea`, `howMuchCaffeine`, `moment`, `minPrice`, `maxPrice`, et
 * plus de `category`, `type`, `q`, `inStock` ni `sort`). Réaligner le catalogue
 * est une story à part entière ; en attendant, ce gel garde l'écran en marche
 * et rend la dette visible à la lecture.
 *
 * À supprimer en reprenant le catalogue sur le contrat courant.
 */
export interface ProductQuery {
  q?: string;
  category?: string;
  type?: ProductType;
  minPriceCents?: number;
  maxPriceCents?: number;
  inStock?: boolean;
  sort?: 'relevance' | 'price_asc' | 'price_desc' | 'newest' | 'name_asc';
  page?: number;
  limit?: number;
}

/* ─────────────────────────────────────────────────────────────────────────
 * HORS CONTRAT — ce que la maquette du profil montre et que `openapi.yaml`
 * (branche `develop` de brume_back) ne porte pas, au 17/11/2026.
 *
 * La connexion passe par Google, seul fournisseur d'identité. L'email et la
 * photo en viennent et ne se modifient pas depuis Brume ; le prénom et le nom
 * aussi, mais restent corrigeables puisqu'ils servent de destinataire des colis.
 *
 * Reste donc la seule photo, facultative : l'écran retombe sur les initiales
 * quand l'API n'en renvoie pas, ce qui est le cas aujourd'hui.
 *
 * La date de naissance de la maquette a été retirée : `UpdateProfileRequest`
 * déclare `additionalProperties: false`, donc l'envoyer ferait répondre 400 à
 * toute modification. À faire ajouter au contrat avant de la remettre.
 * ───────────────────────────────────────────────────────────────────────── */

export interface ProfileExtensions {
  /** Photo de profil fournie par le fournisseur d'identité. */
  avatarUrl?: string | null;
}

/** Profil tel que l'écran « Mon profil » l'affiche. */
export type UserProfile = User & ProfileExtensions;

/**
 * Corps d'une modification de profil.
 *
 * Rien à ajouter au contrat : tout ce que l'écran sait modifier y figure.
 */
export type UpdateProfileDraft = UpdateProfileRequest;

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

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
export type ProductSummaryPage = components['schemas']['ProductSummaryPage'];
export type ProductType = components['schemas']['ProductType'];
export type Availability = components['schemas']['Availability'];
export type Image = components['schemas']['Image'];

/** Paramètres acceptés par `GET /products`, tels que le contrat les déclare. */
export type ProductQuery = NonNullable<operations['listProducts']['parameters']['query']>;

/* ─────────────────────────────────────────────────────────────────────────
 * HORS CONTRAT — champs présents dans la maquette mais absents de
 * `openapi.yaml` (branche `develop` de brume_back) au 27/10/2026.
 *
 * La maquette décrit une connexion par fournisseur d'identité (Google, Apple).
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
 * HORS CONTRAT — filtres de la maquette absents de `openapi.yaml`
 * (branche `develop` de brume_back) au 29/10/2026.
 *
 * La barre de filtres du « Catalogue — ordinateur » compte quatre pastilles :
 * Type, Moment, Caféine et Prix. Seules Type et Prix ont un paramètre dans
 * `GET /products` ; la carte produit affiche pourtant déjà le moment de la
 * journée, et le seed du back porte une caféine par produit sous
 * `attributes.caffeine` — mais ni l'un ni l'autre n'est interrogeable.
 *
 * À faire ajouter au contrat : `moment` et `caffeine` en paramètres de
 * requête de `GET /products`, et les deux champs correspondants sur
 * `ProductSummary`. Tant que ce n'est pas fait, seule l'implémentation
 * simulée les connaît, et `ProductsHttpService` les laisse de côté plutôt
 * que d'envoyer au back des paramètres qu'il rejetterait.
 * ───────────────────────────────────────────────────────────────────────── */

/** Moment de la journée conseillé, affiché sur la carte produit. */
export type Moment = 'MORNING' | 'AFTERNOON' | 'EVENING' | 'ANYTIME';

/** Teneur en caféine. Reprend les valeurs de `attributes.caffeine` du seed. */
export type Caffeine = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';

export interface ProductExtensions {
  moment: Moment;
  caffeine: Caffeine;
  /** Origine, affichée en surtitre de la carte (« Vert · Uji, Japon »). */
  origin: string | null;
  /** Notes de dégustation, affichées en bas de la carte. */
  tastingNotes: string | null;
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

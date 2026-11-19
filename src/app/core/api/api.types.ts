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
export type Image = components['schemas']['Image'];
export type Variant = components['schemas']['Variant'];
export type ProductDetail = components['schemas']['ProductDetail'];

export type Cart = components['schemas']['Cart'];
export type CartItem = components['schemas']['CartItem'];
export type CartWarning = components['schemas']['CartWarning'];
/** Corps de `POST /cart/items` : une variante et une quantité, jamais un prix. */
export type AddCartItemRequest = components['schemas']['AddCartItemRequest'];

/** Choix de filtres présents dans le catalogue, et bornes de prix (US-016). */
export type CatalogueFilters = components['schemas']['CatalogueFilters'];

/** Paramètres acceptés par `GET /products`, tels que le contrat les déclare. */
export type ProductQuery = NonNullable<operations['listProducts']['parameters']['query']>;

/** Tris proposés par `GET /products` (US-017). */
export type Sort = NonNullable<ProductQuery['sort']>;

/* ─────────────────────────────────────────────────────────────────────────
 * HORS CONTRAT — ce que la maquette du profil montre et que `openapi.yaml`
 * (branche `develop` de brume_back) ne porte pas, au 17/11/2026.
 *
 * Une seule chose, et facultative : la photo du compte. Elle vient du
 * fournisseur d'identité quand il y en a un, et l'écran retombe sur les
 * initiales puis sur l'email quand l'API n'en renvoie pas — ce qui est le cas
 * aujourd'hui. Rien dans l'écran ne suppose donc un fournisseur en
 * particulier : l'authentification par email et mot de passe est en cours
 * d'écriture, et Google n'est plus le seul chemin prévu.
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
 * `openapi.yaml` (contrat 1.3.0) ne porte pas, au 19/11/2026.
 *
 * `moment` et `caffeine` sont **arrivés** au contrat en paramètres de
 * `GET /products` : ils ne sont plus hors contrat comme filtres, seulement
 * comme champs de la carte produit, que `ProductSummary` ne renvoie toujours
 * pas. `origin` existe sur `ProductDetail` seulement ; les notes de
 * dégustation et la mention éditoriale n'existent nulle part.
 *
 * `averageRating` et `ratingCount` sont le cas le plus gênant : le tri
 * `rating_desc` est au contrat et `CATALOGUE-SORT.md` annonce les deux champs
 * sur chaque produit du catalogue, mais `ProductSummary` ne les déclare pas.
 * Le tri marche donc côté API sans que la liste puisse montrer la note.
 *
 * À faire ajouter au contrat : ces champs sur `ProductSummary`. Tant que ce
 * n'est pas fait, seule l'implémentation simulée les connaît.
 * ───────────────────────────────────────────────────────────────────────── */

/**
 * Moment de la journée conseillé, affiché sur la carte produit. Les quatre
 * moments sont ceux de « Une tasse pour chaque heure » sur l'accueil :
 * 8 h, 12 h, 16 h, 21 h.
 */
export type Moment = 'MORNING' | 'NOON' | 'AFTERNOON' | 'EVENING';

/** Teneur en caféine. Reprend les valeurs de `attributes.caffeine` du seed. */
export type Caffeine = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';

/**
 * Produit tel que la grille du catalogue l'affiche.
 *
 * N'est plus dérivé de `ProductSummary` : l'API ne sert pas
 * `ProductSummary`, quoi qu'en dise le contrat (voir `catalogue-api.types.ts`).
 * Ce qu'elle ne fournit pas vaut `null` plutôt que d'être inventé : l'écran
 * tait ce qu'il ne sait pas, au lieu d'afficher du faux.
 */
export interface CatalogProduct {
  readonly id: string;
  /** Porté par l'URL de la fiche. Faute de slug à l'API, c'est l'UUID. */
  readonly slug: string;
  readonly name: string;
  readonly type: ProductType | null;
  readonly shortDescription: string | null;
  /** Univers du produit. `null` : l'API ne le renvoie pas. */
  readonly category: CategoryRef | null;
  readonly image: Image | null;
  /** Prix du format le moins cher, en centimes. `null` si aucun format. */
  readonly fromPriceCents: number | null;
  readonly availability: Availability;
  readonly ageRestricted: boolean;
  readonly moment: Moment | null;
  readonly caffeine: Caffeine | null;
  /** Origine, affichée en petites capitales : « Vert · Uji, Japon ». */
  readonly origin: string | null;
  /** Notes de dégustation : « Herbacé · crémeux · umami ». */
  readonly tastingNotes: string | null;
  /** Mention éditoriale sur la photo : « Préféré », « Nouveau », « Rare ». */
  readonly badge: string | null;
  /** Note moyenne sur 5, `null` sans aucun avis noté. Sert au tri `rating_desc`. */
  readonly averageRating: number | null;
  /** Nombre d'avis notés. Départage deux produits de même moyenne. */
  readonly ratingCount: number;
}

/**
 * Produit tel que la fiche l'affiche : la carte du catalogue, plus les
 * variantes de `ProductDetail` (formats, prix et disponibilité), sans
 * lesquelles rien ne peut être ajouté au panier.
 */
export type CatalogProductDetail = CatalogProduct & Pick<ProductDetail, 'variants'>;

/**
 * Filtres tels que **l'écran** les manipule, et tels que l'URL les porte.
 *
 * Ce n'est pas un type d'API : c'est le vocabulaire de la maquette, que
 * `ProductsHttpService` traduit en `ProductQuery` au moment de l'appel. Les
 * deux ne se superposent plus depuis le contrat 1.3.0, et mélanger les deux
 * reviendrait à envoyer au back des paramètres qu'il ne connaît pas.
 *
 * Les quatre derniers champs n'ont **aucun équivalent au contrat** : la barre
 * de filtres les propose encore, l'implémentation simulée les honore, et
 * `ProductsHttpService` les laisse de côté plutôt que de renvoyer une liste
 * qui ne correspondrait pas à ce que l'écran affiche. À faire ajouter au
 * contrat, ou à retirer de la maquette.
 */
export interface CatalogQuery {
  moment?: Moment;
  caffeine?: Caffeine;
  /** Bornes de la tranche choisie, en centimes. `minPrice` / `maxPrice` au contrat. */
  minPriceCents?: number;
  maxPriceCents?: number;
  sort?: Sort;
  page?: number;
  limit?: number;

  /** Onglets d'univers de la maquette. Sans filtre équivalent au contrat. */
  category?: string;
  type?: ProductType;
  inStock?: boolean;
  q?: string;
}

/** Page de produits renvoyée au catalogue. */
export interface CatalogPage {
  data: CatalogProduct[];
  meta: PageMeta;
}

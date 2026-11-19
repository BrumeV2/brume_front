import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { type Observable, catchError, map, of } from 'rxjs';

import { environment } from '../../../environments/environment';
import type {
  Caffeine,
  CatalogPage,
  CatalogProduct,
  CatalogProductDetail,
  CatalogQuery,
  Category,
  Moment,
} from './api.types';
import type {
  CaffeineApi,
  FicheApi,
  FormatApi,
  MomentApi,
  PageApi,
  ProduitApi,
} from './catalogue-api.types';

/**
 * Catalogue : liste filtrée des produits et catégories (US-001, US-016).
 *
 * Classe abstraite servant de jeton d'injection : `app.config.ts` fournit
 * l'implémentation HTTP ou l'implémentation simulée, et aucun composant ne sait
 * laquelle il reçoit.
 */
@Injectable()
export abstract class ProductsService {
  abstract list(query: CatalogQuery): Observable<CatalogPage>;
  abstract categories(): Observable<Category[]>;
  /**
   * Un produit par son `slug`.
   *
   * `GET /products/{slug}` renvoie un `ProductDetail` — description, images,
   * ingrédients, variantes. La fiche en lit la part commune avec la liste et
   * les variantes, nécessaires à l'ajout au panier (US-021) ; le reste est
   * l'affaire d'US-002.
   */
  abstract getBySlug(slug: string): Observable<CatalogProductDetail>;
}

@Injectable()
export class ProductsHttpService extends ProductsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  override list(query: CatalogQuery): Observable<CatalogPage> {
    return this.http
      .get<PageApi>(`${this.baseUrl}/products`, { params: versParams(query) })
      .pipe(map((page) => ({ data: page.data.map(versProduit), meta: page.meta })));
  }

  /**
   * `GET /categories` n'existe pas (404 mesuré le 19/11/2026).
   *
   * Un univers introuvable n'est pas une panne du catalogue : les onglets
   * disparaissent et la grille continue de fonctionner, plutôt que de montrer
   * un écran d'erreur pour une route que le back n'a jamais livrée.
   */
  override categories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.baseUrl}/categories`).pipe(catchError(() => of([])));
  }

  /** L'API attend un UUID ; `slug` en porte un, faute de slug au catalogue. */
  override getBySlug(slug: string): Observable<CatalogProductDetail> {
    return this.http
      .get<FicheApi>(`${this.baseUrl}/products/${encodeURIComponent(slug)}`)
      .pipe(map(versFiche));
  }
}

/** Moments de l'API vers ceux de la maquette. */
const MOMENTS_ECRAN: Readonly<Record<MomentApi, Moment>> = {
  morning: 'MORNING',
  noon: 'NOON',
  snack: 'AFTERNOON',
  evening: 'EVENING',
};

const CAFFEINES_ECRAN: Readonly<Record<CaffeineApi, Caffeine>> = {
  none: 'NONE',
  low: 'LOW',
  medium: 'MEDIUM',
  high: 'HIGH',
};

/**
 * Traduit un produit de l'API vers le modèle de l'écran.
 *
 * Ce que l'API ne renvoie pas reste `null` : ni univers, ni type, ni notes de
 * dégustation, ni mention éditoriale. Inventer une valeur afficherait du faux,
 * et masquerait au passage ce qui manque encore au back.
 */
function versProduit(api: ProduitApi): CatalogProduct {
  return {
    id: api.id,
    // Pas de slug au catalogue : l'UUID porte l'URL de la fiche.
    slug: api.id,
    name: api.name,
    type: null,
    shortDescription: null,
    category: null,
    image: api.image === null ? null : { url: api.image, alt: api.name },
    fromPriceCents: api.lowestPrice,
    availability: api.availability,
    // Absent de l'API. Aucun écran ne s'en sert pour autoriser quoi que ce soit.
    ageRestricted: false,
    moment: MOMENTS_ECRAN[api.moment] ?? null,
    // La liste ne porte pas la caféine ; seule la fiche la connaît.
    caffeine: null,
    origin: api.origin,
    tastingNotes: null,
    badge: null,
    averageRating: api.averageRating,
    ratingCount: api.ratingCount,
  };
}

/**
 * Traduit une fiche de l'API.
 *
 * Les `formats` de l'API tiennent lieu de `variants` du contrat : c'est sur
 * eux que l'ajout au panier s'appuie, donc la correspondance doit être exacte
 * sur l'identifiant et le prix.
 */
function versFiche(api: FicheApi): CatalogProductDetail {
  return {
    ...versProduit({
      ...api,
      ingredients: [],
      lowestPrice: prixLePlusBas(api.formats),
      // La fiche ne porte pas les notes : seule la liste les agrège (US-017).
      averageRating: null,
      ratingCount: 0,
    }),
    shortDescription: api.description,
    caffeine: CAFFEINES_ECRAN[api.howMuchCaffeine] ?? null,
    // Les ingrédients de la fiche tiennent lieu de notes de dégustation : ce
    // sont les seuls mots que l'API donne sur le goût du produit.
    tastingNotes: api.ingredients.map((ingredient) => ingredient.name).join(' · ') || null,
    variants: api.formats.map((format) => ({
      id: format.id,
      sku: format.id,
      label: `${format.quantity} g`,
      priceCents: format.price,
      weightGrams: format.quantity,
      availability: format.availability,
    })),
  };
}

function prixLePlusBas(formats: readonly FormatApi[]): number | null {
  const prix = formats.map((format) => format.price);
  return prix.length === 0 ? null : Math.min(...prix);
}

/**
 * Traduit les filtres de l'écran en paramètres de `GET /products`.
 *
 * Depuis le contrat 1.3.0, le vocabulaire de la maquette et celui de l'API ne
 * se superposent plus : les bornes de prix changent de nom, les moments et la
 * caféine changent de valeurs, et quatre filtres n'ont plus d'équivalent.
 *
 * `category`, `type`, `inStock` et `q` sont donc **laissés de côté**. Les
 * envoyer ferait rejeter la requête entière par le `ValidationPipe` du back,
 * et les envoyer sous un autre nom afficherait une liste qui ne correspond pas
 * à ce que l'écran annonce. Tant que le contrat ne les porte pas, mieux vaut
 * un filtre sans effet qu'une liste fausse — et l'implémentation simulée, elle,
 * les honore, pour que la maquette reste démontrable.
 */
const MOMENTS_API: Readonly<Record<Moment, 'morning' | 'noon' | 'snack' | 'evening'>> = {
  MORNING: 'morning',
  NOON: 'noon',
  // « Goûter » côté maquette, `snack` au contrat : le seul qui ne se devine pas.
  AFTERNOON: 'snack',
  EVENING: 'evening',
};

const CAFFEINES_API: Readonly<Record<Caffeine, 'none' | 'low' | 'medium' | 'high'>> = {
  NONE: 'none',
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
};

function versParams(query: CatalogQuery): HttpParams {
  let params = new HttpParams();

  const poser = (cle: string, valeur: string | number | undefined): void => {
    if (valeur !== undefined && valeur !== '') {
      params = params.set(cle, String(valeur));
    }
  };

  // Les filtres à choix multiples se répètent dans l'URL (`style: form`,
  // `explode: true`) : l'écran n'en pose qu'un à la fois, donc une occurrence.
  if (query.moment !== undefined) {
    params = params.append('moment', MOMENTS_API[query.moment]);
  }
  if (query.caffeine !== undefined) {
    params = params.append('howMuchCaffeine', CAFFEINES_API[query.caffeine]);
  }

  poser('minPrice', query.minPriceCents);
  poser('maxPrice', query.maxPriceCents);
  poser('sort', query.sort);
  poser('page', query.page);
  poser('limit', query.limit);

  return params;
}

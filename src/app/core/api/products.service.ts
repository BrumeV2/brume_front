import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import type {
  Caffeine,
  CatalogPage,
  CatalogProductDetail,
  CatalogQuery,
  Category,
  Moment,
} from './api.types';

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
    return this.http.get<CatalogPage>(`${this.baseUrl}/products`, {
      params: versParams(query),
    });
  }

  override categories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.baseUrl}/categories`);
  }

  override getBySlug(slug: string): Observable<CatalogProductDetail> {
    return this.http.get<CatalogProductDetail>(
      `${this.baseUrl}/products/${encodeURIComponent(slug)}`,
    );
  }
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

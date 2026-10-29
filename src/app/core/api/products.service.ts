import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import type { CatalogPage, CatalogProduct, CatalogQuery, Category } from './api.types';

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
   * ingrédients, variantes. La fiche n'en lit pour l'instant que la part
   * commune avec la liste : le reste est l'affaire d'US-002.
   */
  abstract getBySlug(slug: string): Observable<CatalogProduct>;
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

  override getBySlug(slug: string): Observable<CatalogProduct> {
    return this.http.get<CatalogProduct>(`${this.baseUrl}/products/${encodeURIComponent(slug)}`);
  }
}

/**
 * Traduit les filtres en paramètres de requête.
 *
 * `moment` et `caffeine` sont volontairement laissés de côté : ils n'existent
 * pas dans `GET /products` (voir le bloc « HORS CONTRAT » de `api.types.ts`),
 * et le `ValidationPipe` du back rejetterait la requête entière. Les envoyer
 * casserait la page au lieu de dégrader le filtre.
 */
function versParams(query: CatalogQuery): HttpParams {
  const { moment: _moment, caffeine: _caffeine, ...duContrat } = query;

  let params = new HttpParams();
  for (const [cle, valeur] of Object.entries(duContrat)) {
    if (valeur !== undefined && valeur !== null && valeur !== '') {
      params = params.set(cle, String(valeur));
    }
  }
  return params;
}

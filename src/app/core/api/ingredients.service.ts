import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import type { IngredientListItem } from './api.types';

/**
 * Référentiel des ingrédients (US-015).
 *
 * `search` sert l'autocomplétion : l'API cherche dans le nom **et** dans les
 * synonymes (« badiane » trouve l'anis étoilé), sans casse ni accents. La règle
 * vit côté back ; le front ne la réimplémente pas, il affiche ce qu'on lui
 * renvoie.
 *
 * Classe abstraite servant de jeton d'injection, comme `ProductsService`.
 */
@Injectable()
export abstract class IngredientsService {
  /** Tout le référentiel, y compris les ingrédients présents dans aucun produit. */
  abstract all(): Observable<IngredientListItem[]>;
  /** Ingrédients dont le nom ou un synonyme contient chaque mot de `q` (2 à 100 caractères). */
  abstract search(q: string): Observable<IngredientListItem[]>;
}

@Injectable()
export class IngredientsHttpService extends IngredientsService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/ingredients`;

  override all(): Observable<IngredientListItem[]> {
    return this.http.get<IngredientListItem[]>(this.url);
  }

  override search(q: string): Observable<IngredientListItem[]> {
    return this.http.get<IngredientListItem[]>(this.url, {
      params: new HttpParams().set('q', q),
    });
  }
}

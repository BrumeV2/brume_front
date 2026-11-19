import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import type { AddCartItemRequest, Cart } from './api.types';

/**
 * Panier du client connecté (US-021, D-017 de brume_back).
 *
 * Classe abstraite servant de jeton d'injection : `app.config.ts` fournit
 * `CartHttpService` ou `CartMockService`.
 *
 * Le panier est celui du titulaire du cookie de session : le front n'envoie
 * jamais d'identifiant de panier ni de client, si bien que deux comptes ne
 * peuvent pas lire ou modifier le panier l'un de l'autre. Il n'envoie jamais
 * de prix non plus : l'API le lit dans son catalogue.
 */
@Injectable()
export abstract class CartService {
  /** `GET /cart` — panier et sous-total, recalculés par l'API à chaque lecture. */
  abstract get(): Observable<Cart>;

  /**
   * `POST /cart/items` — ajoute une quantité d'une variante. Si la variante est
   * déjà dans le panier, l'API additionne les quantités et vérifie le stock.
   *
   * Refus possibles : `VALIDATION_ERROR` (400), `NOT_FOUND` (404),
   * `OUT_OF_STOCK` ou `PRODUCT_UNAVAILABLE` (409).
   */
  abstract addItem(item: AddCartItemRequest): Observable<Cart>;

  /**
   * `PATCH /cart/items/{itemId}` — fixe la quantité d'une ligne (US-022). La
   * quantité est absolue : rejouer la même demande donne le même panier.
   *
   * Refus possibles : `VALIDATION_ERROR` (400), `NOT_FOUND` (404, ligne absente
   * de **ce** panier), `OUT_OF_STOCK` ou `PRODUCT_UNAVAILABLE` (409).
   */
  abstract updateItem(itemId: string, quantity: number): Observable<Cart>;

  /**
   * `DELETE /cart/items/{itemId}` — retire une ligne (US-023). Une ligne déjà
   * retirée, ou qui appartient au panier d'un autre client, répond `404`.
   */
  abstract removeItem(itemId: string): Observable<Cart>;

  /**
   * `POST /cart/merge` — verse le panier visiteur dans celui du compte à la
   * connexion. Quantités plafonnées au stock, sans 409 : les écarts reviennent
   * dans `warnings`.
   */
  abstract merge(items: readonly AddCartItemRequest[]): Observable<Cart>;
}

/** Implémentation réelle. Cookies et en-tête CSRF sont ajoutés par `credentialsInterceptor`. */
@Injectable()
export class CartHttpService extends CartService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/cart`;

  override get(): Observable<Cart> {
    return this.http.get<Cart>(this.baseUrl);
  }

  override addItem(item: AddCartItemRequest): Observable<Cart> {
    // Corps reconstruit champ par champ : même si l'appelant passe un objet plus
    // riche (un prix, un identifiant de panier), seuls ces deux champs partent.
    const body: AddCartItemRequest = { variantId: item.variantId, quantity: item.quantity };
    return this.http.post<Cart>(`${this.baseUrl}/items`, body);
  }

  override updateItem(itemId: string, quantity: number): Observable<Cart> {
    return this.http.patch<Cart>(`${this.baseUrl}/items/${encodeURIComponent(itemId)}`, {
      quantity,
    });
  }

  override removeItem(itemId: string): Observable<Cart> {
    return this.http.delete<Cart>(`${this.baseUrl}/items/${encodeURIComponent(itemId)}`);
  }

  override merge(items: readonly AddCartItemRequest[]): Observable<Cart> {
    return this.http.post<Cart>(`${this.baseUrl}/merge`, {
      items: items.map(({ variantId, quantity }) => ({ variantId, quantity })),
    });
  }
}

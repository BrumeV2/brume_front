import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { environment } from '../../../environments/environment';
import type { AddCartItemRequest, Cart } from './api.types';
import { CartHttpService, CartService } from './cart.service';

const CART_URL = `${environment.apiBaseUrl}/cart`;
const VARIANTE = 'b0000000-0000-4000-8000-000000000101';

const panierVide: Cart = {
  id: '90000000-0000-4000-8000-000000000001',
  items: [],
  itemsCount: 0,
  itemsTotalCents: 0,
  ageRestricted: false,
  warnings: [],
};

describe('CartHttpService', () => {
  let service: CartService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: CartService, useClass: CartHttpService },
      ],
    });
    service = TestBed.inject(CartService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lit le panier de la session par `GET /cart`, sans identifiant de panier ni de client', () => {
    service.get().subscribe();

    const requete = http.expectOne(CART_URL);
    expect(requete.request.method).toBe('GET');
    expect(requete.request.params.keys()).toEqual([]);
    requete.flush(panierVide);
  });

  it('ajoute par `POST /cart/items` avec la variante et la quantité seulement', () => {
    service.addItem({ variantId: VARIANTE, quantity: 2 }).subscribe();

    const requete = http.expectOne(`${CART_URL}/items`);
    expect(requete.request.method).toBe('POST');
    expect(requete.request.body).toEqual({ variantId: VARIANTE, quantity: 2 });
    requete.flush(panierVide);
  });

  // Validation d'US-021 : « envoyer un prix falsifié ». Le front ne transmet
  // jamais de prix, même si on lui en glisse un : c'est l'API qui le lit dans
  // son catalogue (et qui refuserait le champ en 400 s'il arrivait).
  it('ne transmet jamais un prix ni un identifiant de panier glissés dans l’appel', () => {
    const falsifie = {
      variantId: VARIANTE,
      quantity: 1,
      unitPriceCents: 1,
      priceCents: 1,
      cartId: 'panier-d-un-autre',
    } as AddCartItemRequest;

    service.addItem(falsifie).subscribe();

    const requete = http.expectOne(`${CART_URL}/items`);
    expect(Object.keys(requete.request.body as object).sort()).toEqual(['quantity', 'variantId']);
    expect(requete.request.url).not.toContain('panier-d-un-autre');
    requete.flush(panierVide);
  });

  it('modifie une quantité par `PATCH /cart/items/{id}`, avec la quantité seule', () => {
    service.updateItem('90000000-0000-4000-8000-000000000011', 3).subscribe();

    const requete = http.expectOne(`${CART_URL}/items/90000000-0000-4000-8000-000000000011`);
    expect(requete.request.method).toBe('PATCH');
    expect(requete.request.body).toEqual({ quantity: 3 });
    requete.flush(panierVide);
  });

  it('retire une ligne par `DELETE /cart/items/{id}`', () => {
    service.removeItem('90000000-0000-4000-8000-000000000011').subscribe();

    const requete = http.expectOne(`${CART_URL}/items/90000000-0000-4000-8000-000000000011`);
    expect(requete.request.method).toBe('DELETE');
    requete.flush(panierVide);
  });

  it('encode l’identifiant de ligne dans le chemin', () => {
    service.removeItem('../cart').subscribe();

    const requete = http.expectOne(`${CART_URL}/items/..%2Fcart`);
    requete.flush(panierVide);
  });

  it('verse le panier visiteur par `POST /cart/merge`, sans prix', () => {
    const lignes = [
      { variantId: VARIANTE, quantity: 2, unitPriceCents: 1 } as AddCartItemRequest,
      { variantId: 'b0000000-0000-4000-8000-000000000201', quantity: 1 },
    ];

    service.merge(lignes).subscribe();

    const requete = http.expectOne(`${CART_URL}/merge`);
    expect(requete.request.method).toBe('POST');
    expect(requete.request.body).toEqual({
      items: [
        { variantId: VARIANTE, quantity: 2 },
        { variantId: 'b0000000-0000-4000-8000-000000000201', quantity: 1 },
      ],
    });
    requete.flush(panierVide);
  });
});

import { TestBed } from '@angular/core/testing';
import { firstValueFrom, type Observable } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';

import { BROWSER_STORAGE, InMemoryStorage } from '../../storage/browser-storage';
import { toApiError, type ApiError } from '../api-error';
import type { AddCartItemRequest, Cart } from '../api.types';
import { CartMockService } from './cart.mock.service';
import { MOCK_ADMIN_ID, MOCK_CUSTOMER_ID } from './fixtures/users.fixture';
import { MockSession } from './mock-session';

/** Matcha cérémonie, Boîte 50 g : 24 €, 40 en stock. */
const MATCHA_50G = 'b0000000-0000-4000-8000-000000000101';
/** Matcha cérémonie, Recharge 100 g : 36 €, 3 en stock. */
const MATCHA_RECHARGE = 'b0000000-0000-4000-8000-000000000103';
/** Kenya AA, en grains : épuisé. */
const KENYA = 'b0000000-0000-4000-8000-000000001101';
/** Oolong de printemps : produit non publié. */
const OOLONG = 'b0000000-0000-4000-8000-000000001501';

describe('CartMockService', () => {
  let service: CartMockService;
  let session: MockSession;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CartMockService, { provide: BROWSER_STORAGE, useValue: new InMemoryStorage() }],
    });
    service = TestBed.inject(CartMockService);
    session = TestBed.inject(MockSession);
  });

  const attendre = (appel: Observable<Cart>): Promise<Cart> => firstValueFrom(appel);

  const ajouter = (item: AddCartItemRequest): Promise<Cart> => attendre(service.addItem(item));

  const echec = async (appel: Observable<Cart>): Promise<ApiError> => {
    try {
      await firstValueFrom(appel);
    } catch (erreur) {
      return toApiError(erreur);
    }
    throw new Error('l’appel aurait dû échouer');
  };

  it('crée une ligne au prix du catalogue', async () => {
    const panier = await ajouter({ variantId: MATCHA_50G, quantity: 2 });

    expect(panier.items).toHaveLength(1);
    expect(panier.items[0]).toMatchObject({
      variantId: MATCHA_50G,
      sku: 'MAT-50G',
      productName: 'Matcha cérémonie',
      variantLabel: 'Boîte 50 g',
      unitPriceCents: 2400,
      quantity: 2,
      lineTotalCents: 4800,
    });
    expect(panier.itemsCount).toBe(2);
    expect(panier.itemsTotalCents).toBe(4800);
  });

  it('additionne les quantités d’une variante déjà au panier, sur une seule ligne', async () => {
    await ajouter({ variantId: MATCHA_50G, quantity: 1 });
    const panier = await ajouter({ variantId: MATCHA_50G, quantity: 2 });

    expect(panier.items).toHaveLength(1);
    expect(panier.items[0]?.quantity).toBe(3);
  });

  // Validation n°1 d'US-021 : la même référence dans deux paniers isolés.
  describe('deux paniers isolés', () => {
    it('donne à chaque client sa propre ligne, dans son propre panier', async () => {
      session.openAs(MOCK_CUSTOMER_ID);
      const panierA = await ajouter({ variantId: MATCHA_50G, quantity: 1 });

      session.openAs(MOCK_ADMIN_ID);
      const panierB = await ajouter({ variantId: MATCHA_50G, quantity: 3 });

      expect(panierB.id).not.toBe(panierA.id);
      expect(panierB.items[0]?.id).not.toBe(panierA.items[0]?.id);
      expect(panierB.items[0]?.quantity).toBe(3);

      // L'ajout du second client n'a pas touché au panier du premier.
      session.openAs(MOCK_CUSTOMER_ID);
      const relu = await attendre(service.get());
      expect(relu.id).toBe(panierA.id);
      expect(relu.items).toHaveLength(1);
      expect(relu.items[0]?.quantity).toBe(1);
    });

    it('vérifie le stock panier par panier', async () => {
      session.openAs(MOCK_CUSTOMER_ID);
      await ajouter({ variantId: MATCHA_RECHARGE, quantity: 3 });

      // Le stock n'est pas réservé au panier (D-011 : réservation à la commande) :
      // un autre client peut encore en ajouter autant.
      session.openAs(MOCK_ADMIN_ID);
      const panierB = await ajouter({ variantId: MATCHA_RECHARGE, quantity: 3 });
      expect(panierB.items[0]?.quantity).toBe(3);
    });

    it('refuse tout accès au panier sans session', async () => {
      session.close();

      const erreur = await echec(service.addItem({ variantId: MATCHA_50G, quantity: 1 }));

      expect(erreur.statusCode).toBe(401);
      expect(erreur.code).toBe('UNAUTHENTICATED');
    });
  });

  // Validation n°2 d'US-021 : prix falsifié, puis quantité supérieure au stock.
  describe('prix falsifié', () => {
    it('refuse un corps qui porte un prix, comme le `ValidationPipe` du back', async () => {
      const falsifie = {
        variantId: MATCHA_50G,
        quantity: 1,
        unitPriceCents: 1,
      } as AddCartItemRequest;

      const erreur = await echec(service.addItem(falsifie));

      expect(erreur.statusCode).toBe(400);
      expect(erreur.code).toBe('VALIDATION_ERROR');
      expect(erreur.fieldErrors['unitPriceCents']).toEqual([
        'property unitPriceCents should not exist',
      ]);
      expect((await attendre(service.get())).items).toEqual([]);
    });

    it('applique toujours le prix du catalogue', async () => {
      const panier = await ajouter({ variantId: MATCHA_50G, quantity: 1 });

      expect(panier.items[0]?.unitPriceCents).toBe(2400);
    });
  });

  describe('quantité supérieure au stock', () => {
    it('refuse en 409 OUT_OF_STOCK, avec la quantité demandée et le stock disponible', async () => {
      const erreur = await echec(service.addItem({ variantId: MATCHA_RECHARGE, quantity: 4 }));

      expect(erreur.statusCode).toBe(409);
      expect(erreur.code).toBe('OUT_OF_STOCK');
      expect(erreur.details).toEqual([
        { variantId: MATCHA_RECHARGE, sku: 'MAT-REC-100G', requested: 4, available: 3 },
      ]);
      expect((await attendre(service.get())).items).toEqual([]);
    });

    it('compte ce qui est déjà au panier', async () => {
      await ajouter({ variantId: MATCHA_RECHARGE, quantity: 2 });

      const erreur = await echec(service.addItem({ variantId: MATCHA_RECHARGE, quantity: 2 }));

      expect(erreur.code).toBe('OUT_OF_STOCK');
      expect(erreur.details).toEqual([
        { variantId: MATCHA_RECHARGE, sku: 'MAT-REC-100G', requested: 4, available: 3 },
      ]);
      // La ligne existante n'a pas bougé.
      expect((await attendre(service.get())).items[0]?.quantity).toBe(2);
    });

    it('refuse une variante épuisée', async () => {
      const erreur = await echec(service.addItem({ variantId: KENYA, quantity: 1 }));

      expect(erreur.code).toBe('OUT_OF_STOCK');
    });
  });

  describe('autres refus', () => {
    it('refuse une quantité hors de 1 à 99', async () => {
      for (const quantity of [0, 100, 1.5]) {
        const erreur = await echec(service.addItem({ variantId: MATCHA_50G, quantity }));
        expect(erreur.code).toBe('VALIDATION_ERROR');
        expect(Object.keys(erreur.fieldErrors)).toEqual(['quantity']);
      }
    });

    it('répond 404 sur une variante inconnue', async () => {
      const erreur = await echec(
        service.addItem({ variantId: 'b0000000-0000-4000-8000-000000009999', quantity: 1 }),
      );

      expect(erreur.code).toBe('NOT_FOUND');
    });

    it('répond 409 PRODUCT_UNAVAILABLE sur un produit non publié', async () => {
      const erreur = await echec(service.addItem({ variantId: OOLONG, quantity: 1 }));

      expect(erreur.code).toBe('PRODUCT_UNAVAILABLE');
    });
  });

  // US-022
  describe('modifier une quantité', () => {
    it('fixe la quantité d’une ligne et recalcule ses montants', async () => {
      const id = (await ajouter({ variantId: MATCHA_50G, quantity: 1 })).items[0]?.id ?? '';

      const panier = await attendre(service.updateItem(id, 4));

      expect(panier.items[0]).toMatchObject({ quantity: 4, lineTotalCents: 9600 });
      expect(panier.itemsTotalCents).toBe(9600);
    });

    it('refuse une quantité supérieure au stock, avec la quantité demandée', async () => {
      const id = (await ajouter({ variantId: MATCHA_RECHARGE, quantity: 1 })).items[0]?.id ?? '';

      const erreur = await echec(service.updateItem(id, 5));

      expect(erreur.code).toBe('OUT_OF_STOCK');
      expect(erreur.details).toEqual([
        { variantId: MATCHA_RECHARGE, sku: 'MAT-REC-100G', requested: 5, available: 3 },
      ]);
      expect((await attendre(service.get())).items[0]?.quantity).toBe(1);
    });

    it('refuse une quantité non admise', async () => {
      const id = (await ajouter({ variantId: MATCHA_50G, quantity: 1 })).items[0]?.id ?? '';

      for (const quantite of [0, 100, 1.5]) {
        expect((await echec(service.updateItem(id, quantite))).code).toBe('VALIDATION_ERROR');
      }
    });
  });

  // US-023
  describe('supprimer un produit', () => {
    it('retire une ligne, puis la dernière', async () => {
      await ajouter({ variantId: MATCHA_50G, quantity: 1 });
      const plein = await ajouter({ variantId: MATCHA_RECHARGE, quantity: 1 });
      const [premiere, seconde] = plein.items;

      const reste = await attendre(service.removeItem(premiere?.id ?? ''));
      expect(reste.items.map((item) => item.sku)).toEqual(['MAT-REC-100G']);
      expect(reste.itemsTotalCents).toBe(3600);

      const vide = await attendre(service.removeItem(seconde?.id ?? ''));
      expect(vide.items).toEqual([]);
      expect(vide.itemsTotalCents).toBe(0);
    });

    it('répond 404 à une suppression répétée', async () => {
      const id = (await ajouter({ variantId: MATCHA_50G, quantity: 1 })).items[0]?.id ?? '';
      await attendre(service.removeItem(id));

      expect((await echec(service.removeItem(id))).code).toBe('NOT_FOUND');
    });

    it('répond 404 sur la ligne d’un autre panier, sans y toucher', async () => {
      session.openAs(MOCK_CUSTOMER_ID);
      const id = (await ajouter({ variantId: MATCHA_50G, quantity: 2 })).items[0]?.id ?? '';

      session.openAs(MOCK_ADMIN_ID);
      expect((await echec(service.removeItem(id))).code).toBe('NOT_FOUND');
      expect((await echec(service.updateItem(id, 1))).code).toBe('NOT_FOUND');

      session.openAs(MOCK_CUSTOMER_ID);
      expect((await attendre(service.get())).items[0]?.quantity).toBe(2);
    });
  });

  describe('fusion du panier visiteur', () => {
    it('additionne, plafonne au stock et signale les écarts sans échouer', async () => {
      await ajouter({ variantId: MATCHA_50G, quantity: 1 });

      const panier = await attendre(
        service.merge([
          { variantId: MATCHA_50G, quantity: 2 },
          { variantId: MATCHA_RECHARGE, quantity: 5 },
          { variantId: KENYA, quantity: 1 },
          { variantId: OOLONG, quantity: 1 },
        ]),
      );

      expect(panier.items.map((item) => [item.sku, item.quantity])).toEqual([
        ['MAT-50G', 3],
        ['MAT-REC-100G', 3],
      ]);
      expect(panier.warnings.map((warning) => [warning.code, warning.sku])).toEqual([
        ['QUANTITY_REDUCED', 'MAT-REC-100G'],
        ['OUT_OF_STOCK', 'KEN-250G-G'],
        ['PRODUCT_UNAVAILABLE', 'OOL-50G'],
      ]);
    });
  });
});

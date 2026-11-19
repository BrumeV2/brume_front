import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, throwError, type Observable } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';

import type { ApiError } from '../api/api-error';
import type { CatalogProductDetail, UserProfile } from '../api/api.types';
import { CartService } from '../api/cart.service';
import { CartMockService } from '../api/mocks/cart.mock.service';
import { MOCK_DELAY_MS } from '../api/mocks/mock-delay';
import { ProductsMockService } from '../api/mocks/products.mock.service';
import { SessionMockService } from '../api/mocks/session.mock.service';
import { UsersMockService } from '../api/mocks/users.mock.service';
import { ProductsService } from '../api/products.service';
import { SessionService } from '../api/session.service';
import { UsersService } from '../api/users.service';
import { AuthService } from '../auth/auth.service';
import { BROWSER_STORAGE, InMemoryStorage } from '../storage/browser-storage';
import { CartStore, GUEST_CART_KEY, refusalFrom, type GuestLine } from './cart.store';

/** Visiteur sans compte : `/users/me` répond 401. */
class Visiteur extends UsersService {
  override getMe(): Observable<UserProfile> {
    return throwError(() => new HttpErrorResponse({ status: 401 }));
  }
  override updateMe(): Observable<UserProfile> {
    return throwError(() => new HttpErrorResponse({ status: 401 }));
  }
}

const pause = (ms = MOCK_DELAY_MS * 2 + 50): Promise<void> =>
  new Promise((resoudre) => setTimeout(resoudre, ms));

describe('CartStore', () => {
  let storage: InMemoryStorage;

  const configurer = (users: typeof UsersService): CartStore => {
    TestBed.configureTestingModule({
      providers: [
        { provide: UsersService, useClass: users },
        { provide: SessionService, useClass: SessionMockService },
        { provide: ProductsService, useClass: ProductsMockService },
        { provide: CartService, useClass: CartMockService },
        { provide: BROWSER_STORAGE, useValue: storage },
      ],
    });
    return TestBed.inject(CartStore);
  };

  const fiche = (slug: string): Promise<CatalogProductDetail> =>
    firstValueFrom(TestBed.inject(ProductsService).getBySlug(slug));

  const variante = (produit: CatalogProductDetail, sku: string) => {
    const trouvee = produit.variants.find((candidate) => candidate.sku === sku);
    if (trouvee === undefined) throw new Error(`variante ${sku} absente`);
    return trouvee;
  };

  const lignesVisiteur = (): GuestLine[] =>
    JSON.parse(storage.getItem(GUEST_CART_KEY) ?? '[]') as GuestLine[];

  beforeEach(() => {
    storage = new InMemoryStorage();
  });

  describe('client connecté', () => {
    let panier: CartStore;
    let matcha: CatalogProductDetail;

    beforeEach(async () => {
      panier = configurer(UsersMockService);
      panier.start();
      TestBed.tick();
      matcha = await fiche('matcha-ceremonie');
    });

    it('confirme la ligne créée, avec les montants de l’API', async () => {
      const resultat = await panier.add(matcha, variante(matcha, 'MAT-50G'), 2);

      expect(resultat).toMatchObject({
        ok: true,
        line: {
          variantId: variante(matcha, 'MAT-50G').id,
          productName: 'Matcha cérémonie',
          productSlug: 'matcha-ceremonie',
          variantLabel: 'Boîte 50 g',
          imageUrl: 'images/produits/matcha-ceremonie.jpg',
          quantity: 2,
          unitPriceCents: 2400,
          lineTotalCents: 4800,
          state: 'stable',
          error: null,
        },
      });
      expect(panier.itemsCount()).toBe(2);
      expect(panier.itemsTotalCents()).toBe(4800);
    });

    it('ouvre le tiroir sur la ligne ajoutée', async () => {
      await panier.add(matcha, variante(matcha, 'MAT-50G'), 1);

      expect(panier.isDrawerOpen()).toBe(true);
      expect(panier.lastAddedVariantId()).toBe(variante(matcha, 'MAT-50G').id);
    });

    it('restitue un refus de stock sans toucher au panier', async () => {
      const resultat = await panier.add(matcha, variante(matcha, 'MAT-REC-100G'), 5);

      expect(resultat).toEqual({
        ok: false,
        refusal: { code: 'OUT_OF_STOCK', message: 'Il ne reste que 3 exemplaires de ce format.' },
      });
      expect(panier.itemsCount()).toBe(0);
      expect(panier.isDrawerOpen()).toBe(false);
    });

    it('rappelle ce qui est déjà au panier quand le cumul dépasse le stock', async () => {
      await panier.add(matcha, variante(matcha, 'MAT-REC-100G'), 2);

      const resultat = await panier.add(matcha, variante(matcha, 'MAT-REC-100G'), 2);

      expect(resultat.ok).toBe(false);
      expect(!resultat.ok && resultat.refusal.message).toBe(
        'Il ne reste que 3 exemplaires de ce format, et tu en as déjà 2 dans ton panier.',
      );
      expect(panier.itemsCount()).toBe(2);
    });

    it('oublie le panier du compte à la déconnexion', async () => {
      await panier.add(matcha, variante(matcha, 'MAT-50G'), 1);

      await TestBed.inject(AuthService).logout();
      TestBed.tick();

      expect(panier.isAccountCart()).toBe(false);
      expect(panier.lines()).toEqual([]);
      expect(panier.itemsCount()).toBe(0);
    });
  });

  // D-017 : panier visiteur en localStorage, sans prix.
  describe('visiteur', () => {
    let panier: CartStore;
    let matcha: CatalogProductDetail;

    beforeEach(async () => {
      panier = configurer(Visiteur);
      matcha = await fiche('matcha-ceremonie');
    });

    it('garde la variante et la quantité, jamais le prix', async () => {
      const resultat = await panier.add(matcha, variante(matcha, 'MAT-50G'), 2);

      expect(resultat.ok).toBe(true);
      expect(lignesVisiteur()).toEqual([
        { variantId: variante(matcha, 'MAT-50G').id, quantity: 2, productSlug: 'matcha-ceremonie' },
      ]);
      expect(panier.itemsCount()).toBe(2);
      // Pas de total : seul le serveur en calcule un.
      expect(panier.itemsTotalCents()).toBeNull();
      expect(panier.lines()[0]?.lineTotalCents).toBeNull();
      expect(panier.lines()[0]?.unitPriceCents).toBe(2400);
    });

    it('additionne les ajouts d’une même variante', async () => {
      await panier.add(matcha, variante(matcha, 'MAT-50G'), 2);
      await panier.add(matcha, variante(matcha, 'MAT-50G'), 3);

      expect(lignesVisiteur()).toHaveLength(1);
      expect(lignesVisiteur()[0]?.quantity).toBe(5);
    });

    it('refuse une variante épuisée', async () => {
      const kenya = await fiche('kenya-aa');

      const resultat = await panier.add(kenya, variante(kenya, 'KEN-250G-G'), 1);

      expect(resultat).toEqual({
        ok: false,
        refusal: { code: 'OUT_OF_STOCK', message: 'Ce format est épuisé pour le moment.' },
      });
      expect(lignesVisiteur()).toEqual([]);
    });

    it('refuse de dépasser 99 exemplaires d’un format', async () => {
      await panier.add(matcha, variante(matcha, 'MAT-50G'), 98);

      const resultat = await panier.add(matcha, variante(matcha, 'MAT-50G'), 2);

      expect(resultat.ok).toBe(false);
      expect(!resultat.ok && resultat.refusal.message).toBe(
        '99 exemplaires au plus par format : tu en as déjà 98 dans ton panier.',
      );
      expect(lignesVisiteur()[0]?.quantity).toBe(98);
    });
  });

  describe('connexion', () => {
    it('verse le panier visiteur dans le panier du compte, puis l’efface', async () => {
      storage.setItem(
        GUEST_CART_KEY,
        JSON.stringify([
          {
            variantId: 'b0000000-0000-4000-8000-000000000101',
            quantity: 2,
            productSlug: 'matcha-ceremonie',
          },
        ]),
      );

      const panier = configurer(UsersMockService);
      panier.start();
      TestBed.tick();
      await pause();

      expect(panier.isAccountCart()).toBe(true);
      expect(panier.lines().map((ligne) => [ligne.variantLabel, ligne.quantity])).toEqual([
        ['Boîte 50 g', 2],
      ]);
      expect(storage.getItem(GUEST_CART_KEY)).toBeNull();
    });

    it('ignore un panier visiteur illisible plutôt que de planter', () => {
      storage.setItem(GUEST_CART_KEY, '{pas du json');

      const panier = configurer(Visiteur);

      expect(panier.itemsCount()).toBe(0);
    });
  });
});

describe('refusalFrom', () => {
  const erreur = (partiel: Partial<ApiError>): ApiError => ({
    statusCode: 409,
    code: 'OUT_OF_STOCK',
    message: 'Stock insuffisant pour 1 article.',
    fieldErrors: {},
    ...partiel,
  });

  it('décide sur le code, pas sur le message', () => {
    expect(
      refusalFrom(erreur({ code: 'PRODUCT_UNAVAILABLE', message: 'n’importe quoi' }), 1),
    ).toEqual({ code: 'PRODUCT_UNAVAILABLE', message: 'Ce format n’est plus disponible.' });
  });

  it('annonce un format épuisé quand il n’en reste aucun', () => {
    const refus = refusalFrom(
      erreur({ details: [{ variantId: 'x', sku: 'X', requested: 1, available: 0 }] }),
      1,
    );

    expect(refus.message).toBe('Ce format est épuisé pour le moment.');
  });

  it('accorde le singulier', () => {
    const refus = refusalFrom(
      erreur({ details: [{ variantId: 'x', sku: 'X', requested: 2, available: 1 }] }),
      2,
    );

    expect(refus.message).toBe('Il ne reste qu’un exemplaire de ce format.');
  });

  it('se rabat sur un message générique sans `details`', () => {
    expect(refusalFrom(erreur({}), 1).message).toBe('Stock insuffisant pour cette quantité.');
  });

  it('reprend le message de l’API pour un code inattendu', () => {
    const refus = refusalFrom(
      erreur({
        statusCode: 0,
        code: 'UNKNOWN',
        message: 'Serveur injoignable. Vérifie ta connexion.',
      }),
      1,
    );

    expect(refus).toEqual({
      code: 'UNKNOWN',
      message: 'Serveur injoignable. Vérifie ta connexion.',
    });
  });
});

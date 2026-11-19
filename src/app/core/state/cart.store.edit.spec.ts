import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Observable, Subject, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';

import type { ApiErrorBody } from '../api/api-error';
import type { Cart, CartItem, CartWarning, UserProfile } from '../api/api.types';
import { CartService } from '../api/cart.service';
import { ProductsMockService } from '../api/mocks/products.mock.service';
import { SessionMockService } from '../api/mocks/session.mock.service';
import { UsersMockService } from '../api/mocks/users.mock.service';
import { ProductsService } from '../api/products.service';
import { SessionService } from '../api/session.service';
import { UsersService } from '../api/users.service';
import { BROWSER_STORAGE, InMemoryStorage } from '../storage/browser-storage';
import { CartStore, GUEST_CART_KEY } from './cart.store';

const MATCHA = 'b0000000-0000-4000-8000-000000000101';
const SENCHA = 'b0000000-0000-4000-8000-000000000201';

/** Ligne au format du contrat ; le total de ligne est celui que « l'API » choisit. */
function ligne(
  id: string,
  variantId: string,
  quantity: number,
  unitPriceCents: number,
  lineTotalCents = unitPriceCents * quantity,
): CartItem {
  return {
    id,
    variantId,
    sku: variantId === MATCHA ? 'MAT-50G' : 'SEN-50G',
    productName: variantId === MATCHA ? 'Matcha cérémonie' : 'Sencha du matin',
    productSlug: variantId === MATCHA ? 'matcha-ceremonie' : 'sencha-du-matin',
    variantLabel: 'Boîte 50 g',
    imageUrl: null,
    unitPriceCents,
    quantity,
    lineTotalCents,
    availability: 'IN_STOCK',
    ageRestricted: false,
  };
}

function panier(items: CartItem[], warnings: CartWarning[] = [], itemsTotalCents?: number): Cart {
  return {
    id: '90000000-0000-4000-8000-000000000001',
    items,
    itemsCount: items.reduce((total, item) => total + item.quantity, 0),
    itemsTotalCents:
      itemsTotalCents ?? items.reduce((total, item) => total + item.lineTotalCents, 0),
    ageRestricted: false,
    warnings,
  };
}

function refus(
  statusCode: number,
  code: ApiErrorBody['code'],
  details?: unknown,
): HttpErrorResponse {
  return new HttpErrorResponse({
    status: statusCode,
    error: { statusCode, code, message: code, path: '/api/cart', timestamp: '', details },
  });
}

/** Demande en vol : le test choisit quand, et comment, l'API y répond. */
interface Demande {
  readonly methode: 'PATCH' | 'DELETE';
  readonly itemId: string;
  readonly quantity?: number;
  readonly reponse: Subject<Cart>;
}

/**
 * API pilotée : `GET /cart` répond tout de suite avec `etat`, mais chaque
 * `PATCH` ou `DELETE` attend que le test le résolve. On peut ainsi faire
 * arriver les réponses dans le désordre, comme sur un vrai réseau.
 */
class ApiPilotee extends CartService {
  etat = panier([ligne('l1', MATCHA, 1, 2400), ligne('l2', SENCHA, 1, 1500)]);
  lectures = 0;
  readonly demandes: Demande[] = [];
  echecLecture: HttpErrorResponse | null = null;

  override get(): Observable<Cart> {
    this.lectures++;
    return this.echecLecture === null
      ? of(structuredClone(this.etat))
      : throwError(() => this.echecLecture);
  }
  override addItem(): Observable<Cart> {
    return of(structuredClone(this.etat));
  }
  override merge(): Observable<Cart> {
    return of(structuredClone(this.etat));
  }
  override updateItem(itemId: string, quantity: number): Observable<Cart> {
    return this.enregistrer({ methode: 'PATCH', itemId, quantity, reponse: new Subject() });
  }
  override removeItem(itemId: string): Observable<Cart> {
    return this.enregistrer({ methode: 'DELETE', itemId, reponse: new Subject() });
  }

  /** Répond à la n-ième demande avec l'état courant, après l'avoir appliquée. */
  accepter(index: number): void {
    const demande = this.demandes[index];
    if (demande === undefined) throw new Error(`pas de demande n° ${index}`);
    this.etat = panier(
      demande.methode === 'DELETE'
        ? this.etat.items.filter((item) => item.id !== demande.itemId)
        : this.etat.items.map((item) =>
            item.id === demande.itemId
              ? ligne(item.id, item.variantId, demande.quantity ?? 1, item.unitPriceCents)
              : item,
          ),
    );
    demande.reponse.next(structuredClone(this.etat));
    demande.reponse.complete();
  }

  refuser(index: number, erreur: HttpErrorResponse): void {
    this.demandes[index]?.reponse.error(erreur);
  }

  private enregistrer(demande: Demande): Observable<Cart> {
    this.demandes.push(demande);
    return demande.reponse.asObservable();
  }
}

/** Visiteur sans compte. */
class Visiteur extends UsersService {
  override getMe(): Observable<UserProfile> {
    return throwError(() => new HttpErrorResponse({ status: 401 }));
  }
  override updateMe(): Observable<UserProfile> {
    return throwError(() => new HttpErrorResponse({ status: 401 }));
  }
}

const microtaches = (): Promise<void> => new Promise((resoudre) => setTimeout(resoudre, 0));

describe('CartStore — modifier, retirer, total, valider', () => {
  let api: ApiPilotee;
  let store: CartStore;

  const demarrer = async (
    users: typeof UsersService = UsersMockService,
    storage = new InMemoryStorage(),
  ): Promise<void> => {
    api = new ApiPilotee();
    TestBed.configureTestingModule({
      providers: [
        { provide: CartService, useValue: api },
        { provide: UsersService, useClass: users },
        { provide: SessionService, useClass: SessionMockService },
        { provide: ProductsService, useClass: ProductsMockService },
        { provide: BROWSER_STORAGE, useValue: storage },
      ],
    });
    store = TestBed.inject(CartStore);
    store.start();
    // `/users/me` simulé répond après sa latence, puis le panier est lu.
    await new Promise((resoudre) => setTimeout(resoudre, 450));
    TestBed.tick();
    await microtaches();
  };

  const quantite = (variantId: string): number | undefined =>
    store.lines().find((l) => l.variantId === variantId)?.quantity;

  describe('US-022 · modifier une quantité', () => {
    beforeEach(() => demarrer());

    it('affiche tout de suite la quantité demandée et marque le total « en cours »', async () => {
      void store.setQuantity(MATCHA, 2);

      expect(quantite(MATCHA)).toBe(2);
      expect(store.lines()[0]?.state).toBe('updating');
      expect(store.totalState()).toBe('updating');
      expect(store.itemsTotalCents()).toBe(3900); // inchangé tant que l'API n'a pas répondu

      api.accepter(0);
      await microtaches();

      expect(store.totalState()).toBe('confirmed');
      expect(store.itemsTotalCents()).toBe(6300);
    });

    // Validation n°1 : augmenter puis diminuer rapidement.
    it('n’applique que la réponse de la dernière demande, même arrivée la première', async () => {
      void store.setQuantity(MATCHA, 2);
      void store.setQuantity(MATCHA, 3);
      void store.setQuantity(MATCHA, 2);
      expect(api.demandes.map((d) => d.quantity)).toEqual([2, 3, 2]);

      // La dernière arrive d'abord…
      api.accepter(2);
      await microtaches();
      expect(quantite(MATCHA)).toBe(2);
      expect(store.totalState()).toBe('confirmed');

      // … puis les deux plus anciennes, en retard : elles ne doivent rien écraser.
      api.etat = panier([ligne('l1', MATCHA, 2, 2400), ligne('l2', SENCHA, 1, 1500)]);
      api.accepter(1);
      api.accepter(0);
      await microtaches();
      expect(quantite(MATCHA)).not.toBe(3);
      expect(store.totalState()).toBe('confirmed');
    });

    // Validation n°2 : quantité supérieure au stock.
    it('revient à la quantité acceptée par l’API après un refus de stock, et l’explique', async () => {
      void store.setQuantity(MATCHA, 9);
      api.refuser(
        0,
        refus(409, 'OUT_OF_STOCK', [
          { variantId: MATCHA, sku: 'MAT-50G', requested: 9, available: 4 },
        ]),
      );
      await microtaches();

      expect(quantite(MATCHA)).toBe(1);
      expect(store.lines()[0]?.error).toBe('Il ne reste que 4 exemplaires de ce format.');
      expect(store.totalState()).toBe('confirmed');
      // La valeur acceptée est relue sur l'API, pas devinée.
      expect(api.lectures).toBe(2);
    });

    // Validation n°2 : quantité non admise.
    it('refuse une quantité hors de 1 à 99 sans rien envoyer', async () => {
      for (const valeur of [0, 100, 2.5]) {
        await store.setQuantity(MATCHA, valeur);
        expect(store.lines()[0]?.error).toBe('Choisis une quantité entre 1 et 99.');
      }
      expect(api.demandes).toEqual([]);
      expect(quantite(MATCHA)).toBe(1);
    });

    it('efface le refus d’une ligne dès la demande suivante', async () => {
      await store.setQuantity(MATCHA, 0);
      void store.setQuantity(MATCHA, 2);

      expect(store.lines()[0]?.error).toBeNull();
    });
  });

  describe('US-023 · supprimer un produit', () => {
    beforeEach(() => demarrer());

    // Validation n°1 : une ligne, puis la dernière.
    it('retire une ligne puis la dernière, avec le total actualisé', async () => {
      void store.remove(MATCHA);
      expect(store.lines()[0]?.state).toBe('removing');
      api.accepter(0);
      await microtaches();

      expect(store.lines().map((l) => l.variantId)).toEqual([SENCHA]);
      expect(store.itemsTotalCents()).toBe(1500);

      void store.remove(SENCHA);
      api.accepter(1);
      await microtaches();

      expect(store.lines()).toEqual([]);
      expect(store.itemsCount()).toBe(0);
    });

    // Validation n°2 : répéter une suppression.
    it('ignore un second clic tant que la suppression est en cours', () => {
      void store.remove(MATCHA);
      void store.remove(MATCHA);

      expect(api.demandes).toHaveLength(1);
    });

    // Validation n°2 : ligne déjà retirée, ou d'un autre panier (404 dans les deux cas).
    it('traite un 404 comme une ligne déjà absente : relecture, sans message d’erreur', async () => {
      void store.remove(MATCHA);
      api.etat = panier([ligne('l2', SENCHA, 1, 1500)]);
      api.refuser(0, refus(404, 'NOT_FOUND'));
      await microtaches();

      expect(store.lines().map((l) => l.variantId)).toEqual([SENCHA]);
      expect(store.lines().every((l) => l.error === null)).toBe(true);
    });

    it('garde la ligne et l’explique quand la suppression échoue', async () => {
      void store.remove(MATCHA);
      api.refuser(0, new HttpErrorResponse({ status: 0 }));
      await microtaches();

      expect(store.lines()[0]).toMatchObject({
        variantId: MATCHA,
        state: 'stable',
        error: 'La suppression n’a pas abouti. Merci de réessayer.',
      });
    });

    it('rend sans objet une modification de quantité encore en vol', async () => {
      void store.setQuantity(MATCHA, 5);
      void store.remove(MATCHA);
      api.accepter(1);
      api.accepter(0); // la réponse tardive du PATCH ne ressuscite pas la ligne
      await microtaches();

      expect(store.lines().map((l) => l.variantId)).toEqual([SENCHA]);
    });
  });

  describe('US-024 · consulter le total', () => {
    // Validation n°1 : quantités multiples ; le total est celui de l'API.
    it('affiche les montants de l’API sans les recalculer', async () => {
      await demarrer();
      api.etat = panier(
        [ligne('l1', MATCHA, 3, 1290, 3870), ligne('l2', SENCHA, 2, 1500)],
        [],
        6870,
      );
      store.reload();
      await microtaches();

      expect(store.itemsCount()).toBe(5);
      expect(store.lines()[0]?.lineTotalCents).toBe(3870);
      expect(store.itemsTotalCents()).toBe(6870);
    });

    it('signale un total non confirmé quand l’API remonte un écart', async () => {
      await demarrer();
      api.etat = panier(api.etat.items, [
        { code: 'QUANTITY_REDUCED', sku: 'MAT-50G', message: 'Stock réduit.' },
      ]);
      store.reload();
      await microtaches();

      expect(store.totalState()).toBe('unconfirmed');
    });

    it('n’annonce aucun total pour un visiteur', async () => {
      await demarrer(Visiteur);

      expect(store.totalState()).toBe('unknown');
      expect(store.itemsTotalCents()).toBeNull();
    });
  });

  describe('US-025 · valider le panier', () => {
    // Validation n°1 : panier valide, puis panier vide.
    it('valide un panier inchangé', async () => {
      await demarrer();

      expect(await store.validate()).toEqual({ status: 'valid' });
    });

    it('refuse un panier vide', async () => {
      await demarrer();
      api.etat = panier([]);

      expect(await store.validate()).toEqual({ status: 'empty' });
    });

    it('envoie un visiteur se connecter (compte obligatoire, D-013)', async () => {
      await demarrer(Visiteur);

      expect(await store.validate()).toEqual({ status: 'login-required' });
    });

    // Validation n°2 : prix modifié avant validation, puis nouvelle demande.
    it('présente un changement de prix, puis valide à la seconde demande', async () => {
      await demarrer();
      api.etat = panier([ligne('l1', MATCHA, 1, 2600), ligne('l2', SENCHA, 1, 1500)]);

      const premiere = await store.validate();
      expect(premiere).toEqual({
        status: 'changed',
        discrepancies: [
          {
            kind: 'price',
            message: 'Le prix de Matcha cérémonie (Boîte 50 g) est passé de 24\u00a0€ à 26\u00a0€.',
          },
        ],
      });
      // Le panier affiché est déjà celui de l'API.
      expect(store.itemsTotalCents()).toBe(4100);

      expect(await store.validate()).toEqual({ status: 'valid' });
    });

    // Validation n°2 : stock modifié avant validation.
    it('bloque tant que l’API signale un problème de stock, jusqu’à correction', async () => {
      await demarrer();
      api.etat = panier(api.etat.items, [
        { code: 'QUANTITY_REDUCED', sku: 'MAT-50G', message: 'Il ne reste que 1 Matcha.' },
      ]);

      expect(await store.validate()).toEqual({
        status: 'blocked',
        discrepancies: [{ kind: 'warning', message: 'Il ne reste que 1 Matcha.' }],
      });

      api.etat = panier(api.etat.items);
      expect(await store.validate()).toEqual({ status: 'valid' });
    });

    it('rapporte une ligne retirée et une quantité réduite par l’API', async () => {
      await demarrer();
      // Panier affiché : Matcha ×1, Sencha ×3.
      api.etat = panier([ligne('l1', MATCHA, 1, 2400), ligne('l2', SENCHA, 3, 1500)]);
      store.reload();
      await microtaches();
      // Entre-temps, l'API a retiré le Matcha et ramené le Sencha à 1.
      api.etat = panier([ligne('l2', SENCHA, 1, 1500)]);

      const resultat = await store.validate();

      expect(resultat.status).toBe('changed');
      expect(resultat.status === 'changed' && resultat.discrepancies.map((d) => d.message)).toEqual(
        [
          'Matcha cérémonie (Boîte 50 g) n’est plus dans ton panier.',
          'La quantité de Sencha du matin (Boîte 50 g) est passée de 3 à 1.',
        ],
      );
    });

    it('ne valide pas un panier en cours de modification', async () => {
      await demarrer();
      void store.setQuantity(MATCHA, 2);

      expect(await store.validate()).toEqual({ status: 'busy' });
    });

    it('oublie la validation dès que le panier change', async () => {
      await demarrer();
      await store.validate();
      void store.setQuantity(MATCHA, 2);

      expect(store.validation()).toBeNull();
    });

    it('rapporte une API injoignable sans prétendre que le panier est valide', async () => {
      await demarrer();
      api.echecLecture = new HttpErrorResponse({ status: 0 });

      expect(await store.validate()).toEqual({
        status: 'error',
        message: 'Serveur injoignable. Vérifie ta connexion.',
      });
    });
  });

  describe('panier visiteur', () => {
    it('modifie et retire localement, sans appel à l’API', async () => {
      const storage = new InMemoryStorage();
      storage.setItem(
        GUEST_CART_KEY,
        JSON.stringify([{ variantId: MATCHA, quantity: 1, productSlug: 'matcha-ceremonie' }]),
      );
      await demarrer(Visiteur, storage);

      await store.setQuantity(MATCHA, 4);
      expect(JSON.parse(storage.getItem(GUEST_CART_KEY) ?? '[]')).toEqual([
        { variantId: MATCHA, quantity: 4, productSlug: 'matcha-ceremonie' },
      ]);

      await store.remove(MATCHA);
      expect(storage.getItem(GUEST_CART_KEY)).toBeNull();
      expect(api.demandes).toEqual([]);
    });
  });
});

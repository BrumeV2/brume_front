import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';

import { BROWSER_STORAGE } from '../../storage/browser-storage';
import type { ApiErrorBody } from '../api-error';
import type { AddCartItemRequest, Cart, CartItem, CartWarning } from '../api.types';
import { CART_RULES } from '../cart-rules';
import { CartService } from '../cart.service';

import { PRODUCTS_FIXTURE, PRODUITS_NON_PUBLIES } from './fixtures/catalog.fixture';
import { VARIANTS_FIXTURE, type MockVariant } from './fixtures/variants.fixture';
import { mockFail, mockOk } from './mock-delay';
import { MockSession } from './mock-session';

const STORAGE_KEY = 'brume.mock.paniers';
const PATH = '/api/cart';

const CART_QUANTITY = CART_RULES.quantity;
const MERGE_MAX_ITEMS = CART_RULES.mergeMaxItems;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface StoredLine {
  id: string;
  variantId: string;
  quantity: number;
}

interface StoredCart {
  id: string;
  lines: StoredLine[];
}

/** Paniers de tous les comptes de l'appareil, rangés par identifiant de client. */
type StoredCarts = Record<string, StoredCart>;

type Details = NonNullable<ApiErrorBody['details']>;

interface Constraint {
  // L'index est exigé par le type `details` du contrat.
  [key: string]: unknown;
  field: string;
  constraints: string[];
}

/**
 * Implémentation simulée de `/cart`.
 *
 * Comme les autres mocks, elle imite le back plutôt que de rendre service :
 * - un panier **par compte**, celui de la session : deux clients qui ajoutent
 *   la même référence obtiennent deux lignes dans deux paniers distincts ;
 * - le prix vient toujours du catalogue : un champ en trop dans le corps, un
 *   prix par exemple, est refusé en 400 comme le ferait le `ValidationPipe`
 *   (`forbidNonWhitelisted`) ;
 * - le stock est vérifié sur la quantité **cumulée** (ligne existante + ajout),
 *   au-delà : `409 OUT_OF_STOCK` avec `requested` et `available`.
 */
@Injectable()
export class CartMockService extends CartService {
  private readonly storage = inject(BROWSER_STORAGE);
  private readonly session = inject(MockSession);

  override get(): Observable<Cart> {
    const userId = this.session.userId;
    if (userId === null) return nonConnecte(PATH);

    // « Créé vide s'il n'existe pas » : son identifiant reste ensuite le même.
    const panier = this.panierDe(userId);
    this.enregistrer(userId, panier);
    return mockOk(versPanier(panier));
  }

  override addItem(item: AddCartItemRequest): Observable<Cart> {
    const chemin = `${PATH}/items`;
    const userId = this.session.userId;
    if (userId === null) return nonConnecte(chemin);

    const problemes = validerLigne(item);
    if (problemes.length > 0) return invalide(problemes, chemin);

    const variante = VARIANTS_FIXTURE.find((candidate) => candidate.id === item.variantId);
    if (variante === undefined) {
      return mockFail(404, 'NOT_FOUND', 'Ressource introuvable.', undefined, chemin);
    }
    if (!estPubliee(variante)) {
      return mockFail(
        409,
        'PRODUCT_UNAVAILABLE',
        'Ce produit n’est plus disponible.',
        [{ variantId: variante.id, sku: variante.sku }],
        chemin,
      );
    }

    const panier = this.panierDe(userId);
    const existante = panier.lines.find((ligne) => ligne.variantId === variante.id);
    const demandee = (existante?.quantity ?? 0) + item.quantity;

    if (demandee > variante.stock) {
      return mockFail(
        409,
        'OUT_OF_STOCK',
        'Stock insuffisant pour 1 article.',
        [
          {
            variantId: variante.id,
            sku: variante.sku,
            requested: demandee,
            available: variante.stock,
          },
        ],
        chemin,
      );
    }
    if (demandee > CART_QUANTITY.max) {
      return invalide(
        [
          {
            field: 'quantity',
            constraints: [`quantity must not be greater than ${CART_QUANTITY.max}`],
          },
        ],
        chemin,
      );
    }

    if (existante === undefined) {
      panier.lines.push({
        id: crypto.randomUUID(),
        variantId: variante.id,
        quantity: item.quantity,
      });
    } else {
      existante.quantity = demandee;
    }
    this.enregistrer(userId, panier);

    return mockOk(versPanier(panier));
  }

  override updateItem(itemId: string, quantity: number): Observable<Cart> {
    const chemin = `${PATH}/items/${itemId}`;
    const userId = this.session.userId;
    if (userId === null) return nonConnecte(chemin);

    const problemes = validerQuantite(quantity);
    if (problemes.length > 0) return invalide(problemes, chemin);

    // Seul le panier de la session est consulté : la ligne d'un autre client
    // répond 404, comme une ligne inconnue, sans révéler qu'elle existe.
    const panier = this.panierDe(userId);
    const ligne = panier.lines.find((candidate) => candidate.id === itemId);
    const variante = VARIANTS_FIXTURE.find((candidate) => candidate.id === ligne?.variantId);
    if (ligne === undefined || variante === undefined) {
      return mockFail(404, 'NOT_FOUND', 'Ressource introuvable.', undefined, chemin);
    }
    if (!estPubliee(variante)) {
      return mockFail(
        409,
        'PRODUCT_UNAVAILABLE',
        'Ce produit n’est plus disponible.',
        [{ variantId: variante.id, sku: variante.sku }],
        chemin,
      );
    }
    if (quantity > variante.stock) {
      return mockFail(
        409,
        'OUT_OF_STOCK',
        'Stock insuffisant pour 1 article.',
        [
          {
            variantId: variante.id,
            sku: variante.sku,
            requested: quantity,
            available: variante.stock,
          },
        ],
        chemin,
      );
    }

    ligne.quantity = quantity;
    this.enregistrer(userId, panier);
    return mockOk(versPanier(panier));
  }

  override removeItem(itemId: string): Observable<Cart> {
    const chemin = `${PATH}/items/${itemId}`;
    const userId = this.session.userId;
    if (userId === null) return nonConnecte(chemin);

    const panier = this.panierDe(userId);
    const reste = panier.lines.filter((ligne) => ligne.id !== itemId);
    if (reste.length === panier.lines.length) {
      return mockFail(404, 'NOT_FOUND', 'Ressource introuvable.', undefined, chemin);
    }

    const allege = { ...panier, lines: reste };
    this.enregistrer(userId, allege);
    return mockOk(versPanier(allege));
  }

  override merge(items: readonly AddCartItemRequest[]): Observable<Cart> {
    const chemin = `${PATH}/merge`;
    const userId = this.session.userId;
    if (userId === null) return nonConnecte(chemin);

    if (!Array.isArray(items) || items.length > MERGE_MAX_ITEMS) {
      return invalide(
        [
          {
            field: 'items',
            constraints: [`items must contain no more than ${MERGE_MAX_ITEMS} elements`],
          },
        ],
        chemin,
      );
    }
    const problemes = items.flatMap((item, index) =>
      validerLigne(item).map((probleme) => ({
        ...probleme,
        field: `items.${index}.${probleme.field}`,
      })),
    );
    if (problemes.length > 0) return invalide(problemes, chemin);

    const panier = this.panierDe(userId);
    const avertissements: CartWarning[] = [];

    for (const item of items) {
      const variante = VARIANTS_FIXTURE.find((candidate) => candidate.id === item.variantId);
      if (variante === undefined || !estPubliee(variante)) {
        avertissements.push({
          code: 'PRODUCT_UNAVAILABLE',
          sku: variante?.sku ?? item.variantId,
          message: 'Un produit de ton panier n’est plus disponible : il a été retiré.',
        });
        continue;
      }
      if (variante.stock === 0) {
        avertissements.push({
          code: 'OUT_OF_STOCK',
          sku: variante.sku,
          message: `${variante.label} est épuisé : il n’a pas été ajouté.`,
        });
        continue;
      }

      const existante = panier.lines.find((ligne) => ligne.variantId === variante.id);
      const voulue = (existante?.quantity ?? 0) + item.quantity;
      const plafond = Math.min(variante.stock, CART_QUANTITY.max);
      const retenue = Math.min(voulue, plafond);
      if (retenue < voulue) {
        avertissements.push({
          code: 'QUANTITY_REDUCED',
          sku: variante.sku,
          message: `Quantité ramenée à ${retenue} : c’est tout ce qu’il nous reste.`,
        });
      }

      if (existante === undefined) {
        panier.lines.push({ id: crypto.randomUUID(), variantId: variante.id, quantity: retenue });
      } else {
        existante.quantity = retenue;
      }
    }

    this.enregistrer(userId, panier);
    const fusionne = versPanier(panier);
    return mockOk({ ...fusionne, warnings: [...avertissements, ...fusionne.warnings] });
  }

  private panierDe(userId: string): StoredCart {
    return this.lire()[userId] ?? { id: crypto.randomUUID(), lines: [] };
  }

  private enregistrer(userId: string, panier: StoredCart): void {
    const paniers = this.lire();
    paniers[userId] = panier;
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(paniers));
    } catch {
      // Navigation privée ou quota atteint : le panier simulé vit le temps de la page.
    }
  }

  private lire(): StoredCarts {
    try {
      const brut = this.storage.getItem(STORAGE_KEY);
      const valeur: unknown = brut === null ? {} : JSON.parse(brut);
      return valeur !== null && typeof valeur === 'object' ? (valeur as StoredCarts) : {};
    } catch {
      return {};
    }
  }
}

function estPubliee(variante: MockVariant): boolean {
  const produit = PRODUCTS_FIXTURE.find((candidate) => candidate.id === variante.productId);
  return produit !== undefined && !PRODUITS_NON_PUBLIES.includes(produit.slug);
}

/**
 * Valide une ligne comme le `ValidationPipe` du back : champs connus seulement,
 * `variantId` en UUID, `quantity` entière entre 1 et 99.
 */
function validerLigne(item: AddCartItemRequest): Constraint[] {
  const problemes: Constraint[] = [];
  if (item === null || typeof item !== 'object') {
    return [{ field: 'body', constraints: ['body must be an object'] }];
  }

  for (const champ of Object.keys(item)) {
    if (champ !== 'variantId' && champ !== 'quantity') {
      problemes.push({ field: champ, constraints: [`property ${champ} should not exist`] });
    }
  }
  if (typeof item.variantId !== 'string' || !UUID.test(item.variantId)) {
    problemes.push({ field: 'variantId', constraints: ['variantId must be a UUID'] });
  }
  return [...problemes, ...validerQuantite(item.quantity)];
}

/** `quantity` entière entre 1 et 99 (`AddCartItemRequest`, `UpdateCartItemRequest`). */
function validerQuantite(quantity: unknown): Constraint[] {
  if (typeof quantity !== 'number' || !Number.isInteger(quantity)) {
    return [{ field: 'quantity', constraints: ['quantity must be an integer number'] }];
  }
  if (quantity < CART_QUANTITY.min) {
    return [
      { field: 'quantity', constraints: [`quantity must not be less than ${CART_QUANTITY.min}`] },
    ];
  }
  if (quantity > CART_QUANTITY.max) {
    return [
      {
        field: 'quantity',
        constraints: [`quantity must not be greater than ${CART_QUANTITY.max}`],
      },
    ];
  }
  return [];
}

/** Panier au format du contrat. Prix et totaux sont ceux du catalogue, recalculés ici. */
function versPanier(panier: StoredCart): Cart {
  const items: CartItem[] = [];
  const warnings: CartWarning[] = [];

  for (const ligne of panier.lines) {
    const variante = VARIANTS_FIXTURE.find((candidate) => candidate.id === ligne.variantId);
    const produit = PRODUCTS_FIXTURE.find((candidate) => candidate.id === variante?.productId);
    if (variante === undefined || produit === undefined) continue;

    if (variante.stock < ligne.quantity) {
      warnings.push({
        code: variante.stock === 0 ? 'OUT_OF_STOCK' : 'QUANTITY_REDUCED',
        sku: variante.sku,
        message:
          variante.stock === 0
            ? `${produit.name} (${variante.label}) est épuisé.`
            : `Il ne reste que ${variante.stock} ${produit.name} (${variante.label}).`,
      });
    }

    items.push({
      id: ligne.id,
      variantId: variante.id,
      sku: variante.sku,
      productName: produit.name,
      productSlug: produit.slug,
      variantLabel: variante.label,
      imageUrl: produit.image?.url ?? null,
      unitPriceCents: variante.priceCents,
      quantity: ligne.quantity,
      lineTotalCents: variante.priceCents * ligne.quantity,
      availability: variante.availability,
      ageRestricted: produit.ageRestricted,
    });
  }

  return {
    id: panier.id,
    items,
    itemsCount: items.reduce((total, item) => total + item.quantity, 0),
    itemsTotalCents: items.reduce((total, item) => total + item.lineTotalCents, 0),
    ageRestricted: items.some((item) => item.ageRestricted),
    warnings,
  };
}

function nonConnecte(chemin: string): Observable<never> {
  return mockFail(401, 'UNAUTHENTICATED', 'Authentification impossible.', undefined, chemin);
}

function invalide(problemes: Constraint[], chemin: string): Observable<never> {
  return mockFail(
    400,
    'VALIDATION_ERROR',
    'Certains champs sont invalides.',
    problemes as unknown as Details,
    chemin,
  );
}

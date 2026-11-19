import { Injectable, InjectionToken, inject } from '@angular/core';
import type { Observable } from 'rxjs';

import type {
  CatalogPage,
  CatalogProduct,
  CatalogProductDetail,
  CatalogQuery,
  Category,
  FormatAvailability,
} from '../api.types';
import type { ApiErrorBody } from '../api-error';
import {
  CAFFEINES,
  CATALOG_RULES,
  MOMENTS,
  PRODUCT_TYPES,
  SORTS,
  type Sort,
} from '../catalog-rules';
import { nomCorrespond } from '../product-search';
import { ProductsService } from '../products.service';
import {
  CATEGORIES_FIXTURE,
  PRODUCTS_FIXTURE,
  PRODUITS_NON_PUBLIES,
} from './fixtures/catalog.fixture';
import { MOCK_DELAY_MS, mockFail, mockOk } from './mock-delay';
import { VARIANTS_FIXTURE, variantesDuProduit } from './fixtures/variants.fixture';

/** Scénarios déterministes, configurables par injection sans mot-clé dans la recherche. */
export const PRODUCTS_MOCK_OPTIONS = new InjectionToken<{
  delayMs: number;
  failFirstSearches: number;
}>('PRODUCTS_MOCK_OPTIONS', {
  providedIn: 'root',
  factory: () => ({ delayMs: MOCK_DELAY_MS, failFirstSearches: 0 }),
});

const CHEMIN = '/api/products';

type Contrainte = { field: string; constraints: string[] };

/**
 * Catalogue simulé.
 *
 * Imite le back plutôt que de rendre service : il valide **avant** de filtrer et
 * renvoie une `VALIDATION_ERROR` au format du contrat sur une valeur non
 * autorisée, comme le `ValidationPipe` de NestJS le ferait sur `GET /products`.
 * La conformité au backend réel reste à vérifier lors de son intégration.
 */
@Injectable()
export class ProductsMockService extends ProductsService {
  private readonly options = inject(PRODUCTS_MOCK_OPTIONS);
  private echecsRestants = this.options.failFirstSearches;

  override categories(): Observable<Category[]> {
    return mockOk([...CATEGORIES_FIXTURE], this.options.delayMs);
  }

  override getBySlug(slug: string): Observable<CatalogProductDetail> {
    const produit = PRODUCTS_FIXTURE.filter(publie).find((p) => p.slug === slug);

    // Un produit non publié répond 404 comme un slug inconnu : son existence
    // n'a pas à transparaître.
    return produit === undefined
      ? mockFail(404, 'NOT_FOUND', 'Ressource introuvable.', undefined, `/api/products/${slug}`)
      : mockOk({ ...produit, variants: variantesDuProduit(produit.id) });
  }

  /**
   * Contrôle d'une quantité sur un format (US-004), aux règles du back.
   *
   * Le stock simulé est celui de `variants.fixture.ts` : la disponibilité
   * reste celle du format, et seule la commandabilité tient compte de la
   * quantité demandée. Un format qui appartient à un autre produit est
   * introuvable, comme côté API.
   */
  override checkAvailability(
    productId: string,
    formatId: string,
    quantity: number,
  ): Observable<FormatAvailability> {
    const format = VARIANTS_FIXTURE.find(
      (variante) => variante.id === formatId && variante.productId === productId,
    );

    if (format === undefined) {
      return mockFail(
        404,
        'NOT_FOUND',
        'Ressource introuvable.',
        undefined,
        `/api/products/${productId}/formats/${formatId}/availability`,
        this.options.delayMs,
      );
    }

    return mockOk(
      {
        productId,
        formatId,
        quantity,
        availability: format.availability,
        isOrderable: format.stock >= quantity && format.stock > 0,
      },
      this.options.delayMs,
    );
  }

  override list(query: CatalogQuery): Observable<CatalogPage> {
    const problemes = valider(query);
    if (problemes.length > 0) {
      return mockFail(
        400,
        'VALIDATION_ERROR',
        'Certains champs sont invalides.',
        problemes as unknown as ApiErrorBody['details'],
        CHEMIN,
        this.options.delayMs,
      );
    }

    if (query.q?.trim() && this.echecsRestants > 0) {
      this.echecsRestants -= 1;
      return mockFail(
        500,
        'INTERNAL_ERROR',
        'La recherche a échoué. Merci de réessayer.',
        undefined,
        CHEMIN,
        this.options.delayMs,
      );
    }

    const trouves = trier(PRODUCTS_FIXTURE.filter(publie).filter(correspond(query)), query.sort);

    const limit = query.limit ?? CATALOG_RULES.limit.default;
    const page = query.page ?? CATALOG_RULES.page.default;
    const debut = (page - 1) * limit;

    return mockOk(
      {
        data: trouves.slice(debut, debut + limit).map((produit) => ({ ...produit })),
        meta: {
          page,
          limit,
          total: trouves.length,
          totalPages: Math.max(1, Math.ceil(trouves.length / limit)),
        },
      },
      this.options.delayMs,
    );
  }
}

/** `GET /products` ne sert que les produits publiés (critère 1 d'US-001). */
function publie(produit: CatalogProduct): boolean {
  return !PRODUITS_NON_PUBLIES.includes(produit.slug);
}

function valider(query: CatalogQuery): Contrainte[] {
  const problemes: Contrainte[] = [];

  const verifierEnum = <T extends string>(
    champ: string,
    valeur: string | undefined,
    autorisees: readonly T[],
  ): void => {
    if (valeur !== undefined && !(autorisees as readonly string[]).includes(valeur)) {
      problemes.push({
        field: champ,
        constraints: [`${champ} must be one of the following values: ${autorisees.join(', ')}`],
      });
    }
  };

  verifierEnum('type', query.type, PRODUCT_TYPES);
  verifierEnum('sort', query.sort, SORTS);
  verifierEnum('moment', query.moment, MOMENTS);
  verifierEnum('caffeine', query.caffeine, CAFFEINES);

  if (
    query.category !== undefined &&
    !CATEGORIES_FIXTURE.some((categorie) => categorie.slug === query.category)
  ) {
    problemes.push({ field: 'category', constraints: ['category must be a known slug'] });
  }

  const entierPositif = (champ: string, valeur: number | undefined, min: number): void => {
    if (valeur === undefined) return;
    if (!Number.isInteger(valeur) || valeur < min) {
      problemes.push({
        field: champ,
        constraints: [`${champ} must be an integer not less than ${min}`],
      });
    }
  };

  entierPositif('minPriceCents', query.minPriceCents, CATALOG_RULES.price.min);
  entierPositif('maxPriceCents', query.maxPriceCents, CATALOG_RULES.price.min);
  entierPositif('page', query.page, CATALOG_RULES.page.min);
  entierPositif('limit', query.limit, CATALOG_RULES.limit.min);

  if (query.limit !== undefined && query.limit > CATALOG_RULES.limit.max) {
    problemes.push({
      field: 'limit',
      constraints: [`limit must not be greater than ${CATALOG_RULES.limit.max}`],
    });
  }

  if (query.q !== undefined && query.q.length > CATALOG_RULES.q.maxLength) {
    problemes.push({
      field: 'q',
      constraints: [`q must be shorter than or equal to ${CATALOG_RULES.q.maxLength} characters`],
    });
  }

  return problemes;
}

function correspond(query: CatalogQuery): (produit: CatalogProduct) => boolean {
  return (produit) => {
    if (query.category !== undefined && produit.category.slug !== query.category) return false;
    if (query.type !== undefined && produit.type !== query.type) return false;
    if (query.moment !== undefined && produit.moment !== query.moment) return false;
    if (query.caffeine !== undefined && produit.caffeine !== query.caffeine) return false;

    if (query.minPriceCents !== undefined && produit.fromPriceCents < query.minPriceCents) {
      return false;
    }
    if (query.maxPriceCents !== undefined && produit.fromPriceCents > query.maxPriceCents) {
      return false;
    }

    if (query.inStock === true && produit.availability === 'OUT_OF_STOCK') return false;

    if (query.q !== undefined && query.q !== '' && !nomCorrespond(produit.name, query.q))
      return false;

    return true;
  };
}

function trier(produits: CatalogProduct[], sort: Sort | undefined): CatalogProduct[] {
  const ordonnes = [...produits];
  switch (sort ?? CATALOG_RULES.defaultSort) {
    case 'price_asc':
      return ordonnes.sort((a, b) => a.fromPriceCents - b.fromPriceCents);
    case 'price_desc':
      return ordonnes.sort((a, b) => b.fromPriceCents - a.fromPriceCents);
    case 'name_asc':
      return ordonnes.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    case 'newest':
      // Le contrat trie sur `createdAt`, que `ProductSummary` ne porte pas :
      // l'ordre du seed fait foi, du plus ancien au plus récent.
      return ordonnes.reverse();
    case 'relevance':
    default:
      return ordonnes;
  }
}

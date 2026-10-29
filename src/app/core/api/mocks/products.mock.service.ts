import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';

import type { CatalogPage, CatalogProduct, CatalogQuery, Category } from '../api.types';
import type { ApiErrorBody } from '../api-error';
import {
  CAFFEINES,
  CATALOG_RULES,
  MOMENTS,
  PRODUCT_TYPES,
  SORTS,
  type Sort,
} from '../catalog-rules';
import { ProductsService } from '../products.service';
import {
  CATEGORIES_FIXTURE,
  PRODUCTS_FIXTURE,
  PRODUITS_NON_PUBLIES,
} from './fixtures/catalog.fixture';
import { mockFail, mockOk } from './mock-delay';

const CHEMIN = '/api/products';

type Contrainte = { field: string; constraints: string[] };

/**
 * Catalogue simulé.
 *
 * Imite le back plutôt que de rendre service : il valide **avant** de filtrer et
 * renvoie une `VALIDATION_ERROR` au format du contrat sur une valeur non
 * autorisée, comme le `ValidationPipe` de NestJS le ferait sur `GET /products`.
 * Un écran qui marche ici marchera donc aussi contre la vraie API.
 */
@Injectable()
export class ProductsMockService extends ProductsService {
  override categories(): Observable<Category[]> {
    return mockOk([...CATEGORIES_FIXTURE]);
  }

  override getBySlug(slug: string): Observable<CatalogProduct> {
    const produit = PRODUCTS_FIXTURE.filter(publie).find((p) => p.slug === slug);

    // Un produit non publié répond 404 comme un slug inconnu : son existence
    // n'a pas à transparaître.
    return produit === undefined
      ? mockFail(404, 'NOT_FOUND', 'Ressource introuvable.', undefined, `/api/products/${slug}`)
      : mockOk({ ...produit });
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
      );
    }

    const trouves = trier(PRODUCTS_FIXTURE.filter(publie).filter(correspond(query)), query.sort);

    const limit = query.limit ?? CATALOG_RULES.limit.default;
    const page = query.page ?? CATALOG_RULES.page.default;
    const debut = (page - 1) * limit;

    return mockOk({
      data: trouves.slice(debut, debut + limit).map((produit) => ({ ...produit })),
      meta: {
        page,
        limit,
        total: trouves.length,
        totalPages: Math.max(1, Math.ceil(trouves.length / limit)),
      },
    });
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

    if (query.q !== undefined && query.q !== '' && !contient(produit.name, query.q)) return false;

    return true;
  };
}

/** Recherche insensible à la casse et aux accents, comme une collation Postgres. */
function contient(valeur: string, recherche: string): boolean {
  const normaliser = (texte: string): string =>
    texte
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase();
  return normaliser(valeur).includes(normaliser(recherche));
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

import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';

import type {
  CatalogPage,
  CatalogProduct,
  CatalogProductDetail,
  CatalogQuery,
  Category,
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
import { ProductsService } from '../products.service';
import {
  CATEGORIES_FIXTURE,
  PRODUCTS_FIXTURE,
  PRODUITS_NON_PUBLIES,
} from './fixtures/catalog.fixture';
import { variantesDuProduit } from './fixtures/variants.fixture';
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

  override getBySlug(slug: string): Observable<CatalogProductDetail> {
    const produit = PRODUCTS_FIXTURE.filter(publie).find((p) => p.slug === slug);

    // Un produit non publié répond 404 comme un slug inconnu : son existence
    // n'a pas à transparaître.
    return produit === undefined
      ? mockFail(404, 'NOT_FOUND', 'Ressource introuvable.', undefined, `/api/products/${slug}`)
      : mockOk({ ...produit, variants: variantesDuProduit(produit.id) });
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

/**
 * Trie comme `GET /products` (US-017, `CATALOGUE-SORT.md` de brume_back).
 *
 * Tout tri se termine par le nom puis l'identifiant : c'est ce départage qui
 * rend l'ordre **total**. Sans lui, deux produits au même prix pourraient
 * changer de place d'une requête à l'autre, et donc apparaître deux fois ou
 * disparaître entre deux pages — exactement ce que le parcours par lots
 * d'US-001 ne doit jamais faire.
 *
 * `fromPriceCents` est obligatoire au contrat : le cas « produit sans prix »,
 * que le back range en dernier, ne peut pas se produire ici.
 */
function trier(produits: CatalogProduct[], sort: Sort | undefined): CatalogProduct[] {
  const choisi = sort ?? CATALOG_RULES.defaultSort;

  if (choisi === 'newest') {
    // Le contrat trie sur la date d'ajout, que `ProductSummary` ne porte pas :
    // l'ordre du seed fait foi, du plus récent au plus ancien.
    return [...produits].reverse();
  }

  // `name_asc` n'a pas de clé propre : il tombe directement sur le départage.
  const cle: Record<Exclude<Sort, 'newest'>, (a: CatalogProduct, b: CatalogProduct) => number> = {
    name_asc: () => 0,
    name_desc: (a, b) => b.name.localeCompare(a.name, 'fr'),
    price_asc: (a, b) => a.fromPriceCents - b.fromPriceCents,
    price_desc: (a, b) => b.fromPriceCents - a.fromPriceCents,
    rating_desc: parNote,
  };

  return [...produits].sort(
    (a, b) => cle[choisi](a, b) || a.name.localeCompare(b.name, 'fr') || a.id.localeCompare(b.id),
  );
}

/**
 * Note moyenne décroissante, puis nombre d'avis.
 *
 * Un produit sans aucun avis noté passe toujours en dernier, et deux produits
 * sans avis se départagent comme les autres, par le nom.
 */
function parNote(a: CatalogProduct, b: CatalogProduct): number {
  if (a.averageRating === null || b.averageRating === null) {
    return Number(a.averageRating === null) - Number(b.averageRating === null);
  }
  return b.averageRating - a.averageRating || b.ratingCount - a.ratingCount;
}

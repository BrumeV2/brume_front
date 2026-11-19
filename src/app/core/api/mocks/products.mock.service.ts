import { Injectable, InjectionToken, inject } from '@angular/core';
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
import { nomCorrespond } from '../product-search';
import { ProductsService } from '../products.service';
import {
  CATEGORIES_FIXTURE,
  PRODUCTS_FIXTURE,
  PRODUITS_NON_PUBLIES,
} from './fixtures/catalog.fixture';
import { MOCK_DELAY_MS, mockFail, mockOk } from './mock-delay';
import { variantesDuProduit } from './fixtures/variants.fixture';

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
    // Un produit sans univers ne correspond à aucun filtre d'univers.
    if (query.category !== undefined && produit.category?.slug !== query.category) return false;
    if (query.type !== undefined && produit.type !== query.type) return false;
    if (query.moment !== undefined && produit.moment !== query.moment) return false;
    if (query.caffeine !== undefined && produit.caffeine !== query.caffeine) return false;

    // Sans prix, un produit sort de toute tranche demandée.
    const prix = produit.fromPriceCents;
    if (query.minPriceCents !== undefined && (prix === null || prix < query.minPriceCents)) {
      return false;
    }
    if (query.maxPriceCents !== undefined && (prix === null || prix > query.maxPriceCents)) {
      return false;
    }

    if (query.inStock === true && produit.availability === 'OUT_OF_STOCK') return false;

    if (query.q !== undefined && query.q !== '' && !nomCorrespond(produit.name, query.q))
      return false;

    return true;
  };
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
 * Un produit sans prix — l'API renvoie `lowestPrice: null` quand il n'a aucun
 * format — part en dernier, dans un sens comme dans l'autre.
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
    price_asc: (a, b) => parPrix(a, b, 1),
    price_desc: (a, b) => parPrix(a, b, -1),
    rating_desc: parNote,
  };

  return [...produits].sort(
    (a, b) => cle[choisi](a, b) || a.name.localeCompare(b.name, 'fr') || a.id.localeCompare(b.id),
  );
}

/**
 * Prix croissant ou décroissant, un produit sans prix toujours en dernier,
 * dans les deux sens — comme `CATALOGUE-SORT.md` le demande.
 */
function parPrix(a: CatalogProduct, b: CatalogProduct, sens: 1 | -1): number {
  if (a.fromPriceCents === null || b.fromPriceCents === null) {
    return Number(a.fromPriceCents === null) - Number(b.fromPriceCents === null);
  }
  return (a.fromPriceCents - b.fromPriceCents) * sens;
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

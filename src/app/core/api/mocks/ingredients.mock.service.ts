import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';

import type { ApiErrorBody } from '../api-error';
import type { IngredientListItem } from '../api.types';
import { CATALOG_RULES } from '../catalog-rules';
import { IngredientsService } from '../ingredients.service';
import { ingredientCorrespond, nettoyerRecherche } from '../product-search';
import { PRODUCTS_FIXTURE, PRODUITS_NON_PUBLIES } from './fixtures/catalog.fixture';
import { INGREDIENTS_FIXTURE, ingredientsDuProduit } from './fixtures/ingredients.fixture';
import { mockFail, mockOk } from './mock-delay';
import { PRODUCTS_MOCK_OPTIONS } from './products.mock.service';

const CHEMIN = '/api/ingredients';

/**
 * `GET /ingredients` simulé (US-015).
 *
 * Suit le contrat 1.5.0 : tout le référentiel trié par nom, `productCount`
 * compté sur les seuls produits publiés, et `q` validé **avant** de chercher
 * (2 à 100 caractères après nettoyage des espaces, sinon 400).
 *
 * Partage la latence du catalogue simulé : les deux répondent au même écran.
 */
@Injectable()
export class IngredientsMockService extends IngredientsService {
  private readonly options = inject(PRODUCTS_MOCK_OPTIONS);

  override all(): Observable<IngredientListItem[]> {
    return mockOk(referentiel(), this.options.delayMs);
  }

  override search(q: string): Observable<IngredientListItem[]> {
    const recherche = nettoyerRecherche(q);
    const { minLength, maxLength } = CATALOG_RULES.ingredientSearch;
    if (recherche.length < minLength || recherche.length > maxLength) {
      return mockFail(
        400,
        'VALIDATION_ERROR',
        'Certains champs sont invalides.',
        [
          {
            field: 'q',
            constraints: [`q must be between ${minLength} and ${maxLength} characters`],
          },
        ] as unknown as ApiErrorBody['details'],
        CHEMIN,
        this.options.delayMs,
      );
    }
    return mockOk(
      referentiel().filter((ingredient) => ingredientCorrespond(ingredient, recherche)),
      this.options.delayMs,
    );
  }
}

function referentiel(): IngredientListItem[] {
  const publies = PRODUCTS_FIXTURE.filter((p) => !PRODUITS_NON_PUBLIES.includes(p.slug));
  return INGREDIENTS_FIXTURE.map((ingredient) => ({
    ...ingredient,
    aliases: [...ingredient.aliases],
    productCount: publies.filter((p) => ingredientsDuProduit(p.slug).includes(ingredient.id))
      .length,
  })).sort((a, b) => a.name.localeCompare(b.name, 'fr') || a.id.localeCompare(b.id));
}

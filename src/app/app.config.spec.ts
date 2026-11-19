import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { describe, expect, it } from 'vitest';

import { environment } from '../environments/environment';
import { environment as production } from '../environments/environment.prod';
import { appConfig } from './app.config';
import { PRODUCTS_MOCK_OPTIONS, ProductsMockService } from './core/api/mocks/products.mock.service';
import { ProductsHttpService, ProductsService } from './core/api/products.service';
import { IngredientsHttpService, IngredientsService } from './core/api/ingredients.service';

describe('Catalogue : configuration applicative', () => {
  /**
   * Le catalogue ne suit que son propre drapeau.
   *
   * Il l'a longtemps suivi « ou `useMocks` », ce qui rendait le branchement
   * sur l'API injoignable : tant que les comptes et le panier restaient
   * simulés, passer `useCatalogMocks` à `false` n'avait aucun effet.
   */
  it('branche le catalogue sur l’API dès que `useCatalogMocks` est à `false`', () => {
    TestBed.configureTestingModule({
      providers: [...appConfig.providers, provideHttpClientTesting()],
    });

    expect(environment.useCatalogMocks).toBe(false);
    expect(TestBed.inject(ProductsService)).toBeInstanceOf(ProductsHttpService);
  });

  // Les UUID d'ingrédients choisis doivent exister dans le catalogue interrogé.
  it('branche le référentiel d’ingrédients sur la même source que le catalogue', () => {
    TestBed.configureTestingModule({
      providers: [...appConfig.providers, provideHttpClientTesting()],
    });

    expect(TestBed.inject(IngredientsService)).toBeInstanceOf(IngredientsHttpService);
  });

  /**
   * La préproduction n'a pas de back : elle garde les données simulées, sans
   * quoi la boutique n'y montrerait qu'une erreur de chargement.
   */
  it('garde les données simulées en production, faute d’API déployée', () => {
    expect(production.useCatalogMocks).toBe(true);
  });

  // Garantie d'US-014 : en mode simulé, rien ne part sur le réseau.
  it('répond sans aucun appel HTTP quand le catalogue est simulé', async () => {
    TestBed.configureTestingModule({
      providers: [
        ...appConfig.providers,
        provideHttpClientTesting(),
        { provide: ProductsService, useClass: ProductsMockService },
        { provide: PRODUCTS_MOCK_OPTIONS, useValue: { delayMs: 0, failFirstSearches: 0 } },
      ],
    });
    const service = TestBed.inject(ProductsService);

    expect(service).toBeInstanceOf(ProductsMockService);
    expect((await firstValueFrom(service.list({ q: 'maison' }))).data).toHaveLength(2);
    expect((await firstValueFrom(service.categories())).length).toBeGreaterThan(0);
    expect((await firstValueFrom(service.getBySlug('chai-maison'))).name).toBe('Chaï maison');

    TestBed.inject(HttpTestingController).expectNone(() => true);
    TestBed.inject(HttpTestingController).verify();
  });
});

import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { describe, expect, it } from 'vitest';

import { environment as production } from '../environments/environment.prod';
import { appConfig } from './app.config';
import { PRODUCTS_MOCK_OPTIONS, ProductsMockService } from './core/api/mocks/products.mock.service';
import { ProductsService } from './core/api/products.service';

describe('Catalogue US-014 : configuration applicative', () => {
  it('utilise le mock et ne fait aucun appel HTTP pour rechercher, lister les catégories ou ouvrir une fiche', async () => {
    TestBed.configureTestingModule({
      providers: [
        ...appConfig.providers,
        provideHttpClientTesting(),
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
    expect(production.useCatalogMocks).toBe(true);
  });
});

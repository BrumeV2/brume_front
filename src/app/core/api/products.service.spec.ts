import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { environment } from '../../../environments/environment';
import { ProductsHttpService, ProductsService } from './products.service';

const PRODUCTS_URL = `${environment.apiBaseUrl}/products`;

describe('ProductsHttpService', () => {
  let service: ProductsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ProductsService, useClass: ProductsHttpService },
      ],
    });
    service = TestBed.inject(ProductsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('appelle `GET /products` sans paramètre quand aucun filtre n’est posé', () => {
    service.list({}).subscribe();

    const requete = http.expectOne((r) => r.url === PRODUCTS_URL);
    expect(requete.request.method).toBe('GET');
    expect(requete.request.params.keys()).toEqual([]);
    requete.flush({ data: [], meta: { page: 1, limit: 24, total: 0, totalPages: 1 } });
  });

  it('transmet les filtres du contrat', () => {
    service
      .list({ category: 'thes', type: 'TEA', minPriceCents: 500, sort: 'price_asc' })
      .subscribe();

    const requete = http.expectOne((r) => r.url === PRODUCTS_URL);
    expect(requete.request.params.get('category')).toBe('thes');
    expect(requete.request.params.get('type')).toBe('TEA');
    expect(requete.request.params.get('minPriceCents')).toBe('500');
    expect(requete.request.params.get('sort')).toBe('price_asc');
    requete.flush({ data: [], meta: { page: 1, limit: 24, total: 0, totalPages: 1 } });
  });

  it('n’envoie PAS les filtres hors contrat, que le back rejetterait', () => {
    service.list({ category: 'thes', moment: 'MORNING', caffeine: 'HIGH' }).subscribe();

    const requete = http.expectOne((r) => r.url === PRODUCTS_URL);
    expect(requete.request.params.get('category')).toBe('thes');
    expect(requete.request.params.has('moment')).toBe(false);
    expect(requete.request.params.has('caffeine')).toBe(false);
    requete.flush({ data: [], meta: { page: 1, limit: 24, total: 0, totalPages: 1 } });
  });

  it('appelle `GET /products/{slug}`, en échappant le slug', () => {
    service.getBySlug('earl grey/au chanvre').subscribe();

    http.expectOne(`${PRODUCTS_URL}/earl%20grey%2Fau%20chanvre`).flush({});
  });

  it('appelle `GET /categories`', () => {
    service.categories().subscribe();

    http.expectOne(`${environment.apiBaseUrl}/categories`).flush([]);
  });
});

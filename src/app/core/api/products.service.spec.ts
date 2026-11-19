import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { environment } from '../../../environments/environment';
import type { FicheApi } from './catalogue-api.types';
import { SORTS } from './catalog-rules';
import { ProductsHttpService, ProductsService } from './products.service';

const PRODUCTS_URL = `${environment.apiBaseUrl}/products`;

/** Fiche minimale au contrat, pour que le traducteur ait de quoi travailler. */
const FICHE: FicheApi = {
  id: '7f4e1aaf-f258-418e-b0d8-525ac86c90af',
  name: 'Sencha Hibiscus',
  description: null,
  typeTea: 'vert',
  origin: 'Japon',
  howMuchCaffeine: 'medium',
  moment: 'morning',
  image: null,
  ingredients: [],
  formats: [],
  availability: 'IN_STOCK',
  isOrderable: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

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

  it('transmet le tri et les bornes de prix sous les noms du contrat', () => {
    service.list({ minPriceCents: 500, maxPriceCents: 2500, sort: 'price_asc' }).subscribe();

    const requete = http.expectOne((r) => r.url === PRODUCTS_URL);
    expect(requete.request.params.get('minPrice')).toBe('500');
    expect(requete.request.params.get('maxPrice')).toBe('2500');
    expect(requete.request.params.get('sort')).toBe('price_asc');
    // Les anciens noms ne doivent plus partir : le back les refuserait.
    expect(requete.request.params.has('minPriceCents')).toBe(false);
    requete.flush({ data: [], meta: { page: 1, limit: 24, total: 0, totalPages: 1 } });
  });

  it('transmet chacun des tris du sélecteur', () => {
    for (const sort of SORTS) {
      service.list({ sort }).subscribe();
      const requete = http.expectOne((r) => r.url === PRODUCTS_URL);
      expect(requete.request.params.get('sort')).toBe(sort);
      requete.flush({ data: [], meta: { page: 1, limit: 24, total: 0, totalPages: 1 } });
    }
  });

  it('traduit le moment et la caféine dans les valeurs du contrat', () => {
    service.list({ moment: 'AFTERNOON', caffeine: 'HIGH' }).subscribe();

    const requete = http.expectOne((r) => r.url === PRODUCTS_URL);
    // « Goûter » dans la maquette, `snack` au contrat.
    expect(requete.request.params.get('moment')).toBe('snack');
    expect(requete.request.params.get('howMuchCaffeine')).toBe('high');
    expect(requete.request.params.has('caffeine')).toBe(false);
    requete.flush({ data: [], meta: { page: 1, limit: 24, total: 0, totalPages: 1 } });
  });

  it('n’envoie PAS les filtres absents du contrat, que le back rejetterait', () => {
    service.list({ category: 'thes', type: 'TEA', inStock: true, q: 'matcha' }).subscribe();

    const requete = http.expectOne((r) => r.url === PRODUCTS_URL);
    expect(requete.request.params.keys()).toEqual([]);
    requete.flush({ data: [], meta: { page: 1, limit: 24, total: 0, totalPages: 1 } });
  });

  it('appelle `GET /products/{id}` avec l’UUID, échappé', () => {
    service.getBySlug(FICHE.id).subscribe();

    http.expectOne(`${PRODUCTS_URL}/${FICHE.id}`).flush(FICHE);
  });

  // La fiche ne porte pas de note : seule la liste les agrège (US-017).
  it('n’invente pas de note sur la fiche, que l’API ne renvoie pas', async () => {
    const fiche = firstValueFrom(service.getBySlug(FICHE.id));
    http.expectOne(`${PRODUCTS_URL}/${FICHE.id}`).flush(FICHE);

    expect(await fiche).toMatchObject({ averageRating: null, ratingCount: 0 });
  });

  it('appelle `GET /categories`', () => {
    service.categories().subscribe();

    http.expectOne(`${environment.apiBaseUrl}/categories`).flush([]);
  });
});

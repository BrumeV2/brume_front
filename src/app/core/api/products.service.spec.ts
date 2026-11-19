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

  it('envoie les ingrédients en paramètre répété, avec leur combinaison (US-015)', () => {
    service.list({ ingredients: ['id-menthe', 'id-citron'], ingredientsMatch: 'all' }).subscribe();

    const requete = http.expectOne((r) => r.url === PRODUCTS_URL);
    expect(requete.request.params.getAll('ingredients')).toEqual(['id-menthe', 'id-citron']);
    expect(requete.request.params.get('ingredientsMatch')).toBe('all');
    expect(requete.request.urlWithParams).toContain('ingredients=id-menthe&ingredients=id-citron');
    requete.flush({ data: [], meta: { page: 1, limit: 24, total: 0, totalPages: 1 } });
  });

  it('n’envoie pas une liste d’ingrédients vide, que le back refuserait', () => {
    service.list({ ingredients: [] }).subscribe();

    const requete = http.expectOne((r) => r.url === PRODUCTS_URL);
    expect(requete.request.params.has('ingredients')).toBe(false);
    requete.flush({ data: [], meta: { page: 1, limit: 24, total: 0, totalPages: 1 } });
  });

  it('n’envoie PAS les filtres absents du contrat, que le back rejetterait', () => {
    service.list({ category: 'thes', type: 'TEA', inStock: true }).subscribe();

    const requete = http.expectOne((r) => r.url === PRODUCTS_URL);
    expect(requete.request.params.keys()).toEqual([]);
    requete.flush({ data: [], meta: { page: 1, limit: 24, total: 0, totalPages: 1 } });
  });

  describe('recherche, que l’API ne sait pas faire', () => {
    const produit = (name: string): Record<string, unknown> => ({
      id: name,
      name,
      typeTea: null,
      origin: null,
      ingredients: [],
      moment: 'morning',
      image: null,
      lowestPrice: 500,
      averageRating: null,
      ratingCount: 0,
      availability: 'IN_STOCK',
      isOrderable: true,
    });

    it('rapatrie toutes les pages, puis filtre sur le nom', async () => {
      const page = firstValueFrom(service.list({ q: 'matcha', sort: 'name_asc' }));

      const premiere = http.expectOne((r) => r.url === PRODUCTS_URL);
      // La recherche n’est pas un paramètre d’API : elle ne part pas.
      expect(premiere.request.params.has('q')).toBe(false);
      // La pagination de l’écran non plus : elle est recalculée après filtrage.
      expect(premiere.request.params.get('limit')).toBe('100');
      expect(premiere.request.params.get('page')).toBe('1');
      expect(premiere.request.params.get('sort')).toBe('name_asc');
      premiere.flush({
        data: [produit('Matcha Nature')],
        meta: { page: 1, limit: 100, total: 2, totalPages: 2 },
      });

      const seconde = http.expectOne((r) => r.params.get('page') === '2');
      seconde.flush({
        data: [produit('Sencha Hibiscus')],
        meta: { page: 2, limit: 100, total: 2, totalPages: 2 },
      });

      const resultat = await page;
      expect(resultat.data.map((p) => p.name)).toEqual(['Matcha Nature']);
      expect(resultat.meta).toMatchObject({ total: 1, totalPages: 1 });
    });

    it('ignore la casse et les accents, comme l’implémentation simulée', async () => {
      const page = firstValueFrom(service.list({ q: 'MATE' }));

      http
        .expectOne((r) => r.url === PRODUCTS_URL)
        .flush({
          data: [produit('Maté Tropical'), produit('Sencha Nature')],
          meta: { page: 1, limit: 100, total: 2, totalPages: 1 },
        });

      expect((await page).data.map((p) => p.name)).toEqual(['Maté Tropical']);
    });

    it('pagine les résultats retenus, pas le catalogue entier', async () => {
      const page = firstValueFrom(service.list({ q: 'thé', page: 2, limit: 2 }));

      http
        .expectOne((r) => r.url === PRODUCTS_URL)
        .flush({
          data: ['Thé A', 'Thé B', 'Thé C', 'Autre'].map(produit),
          meta: { page: 1, limit: 100, total: 4, totalPages: 1 },
        });

      const resultat = await page;
      expect(resultat.data.map((p) => p.name)).toEqual(['Thé C']);
      expect(resultat.meta).toMatchObject({ page: 2, limit: 2, total: 3, totalPages: 2 });
    });

    it('n’appelle qu’une fois l’API quand une recherche est vide', () => {
      service.list({ q: '   ' }).subscribe();

      const requete = http.expectOne((r) => r.url === PRODUCTS_URL);
      expect(requete.request.params.keys()).toEqual([]);
      requete.flush({ data: [], meta: { page: 1, limit: 24, total: 0, totalPages: 1 } });
    });
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

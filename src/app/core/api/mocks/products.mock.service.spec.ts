import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';

import type { ApiError } from '../api-error';
import { toApiError } from '../api-error';
import type { CatalogPage, CatalogQuery } from '../api.types';
import { ProductsMockService } from './products.mock.service';

describe('ProductsMockService', () => {
  let service: ProductsMockService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [ProductsMockService] });
    service = TestBed.inject(ProductsMockService);
  });

  const lister = (query: CatalogQuery = {}): Promise<CatalogPage> =>
    firstValueFrom(service.list(query));

  const slugs = async (query: CatalogQuery = {}): Promise<string[]> =>
    (await lister(query)).data.map((produit) => produit.slug);

  const echec = async (query: CatalogQuery): Promise<ApiError> => {
    try {
      await lister(query);
    } catch (erreur) {
      return toApiError(erreur);
    }
    throw new Error('la requête aurait dû échouer');
  };

  describe('sans filtre', () => {
    it('ne sert que les produits publiés', async () => {
      const page = await lister({ limit: 100 });

      expect(page.data).not.toHaveLength(0);
      expect(page.data.map((p) => p.slug)).not.toContain('oolong-de-printemps');
      expect(page.meta.total).toBe(page.data.length);
    });

    it('donne à chaque produit un nom, un prix et un visuel', async () => {
      const page = await lister({ limit: 100 });

      for (const produit of page.data) {
        expect(produit.name).not.toBe('');
        expect(produit.fromPriceCents).toBeGreaterThan(0);
        expect(produit.image?.url).toMatch(/^images\/produits\/.+\.jpg$/);
      }
    });

    it('décrit la page avec `meta`, jamais en comptant les éléments reçus', async () => {
      const page = await lister({ limit: 2, page: 1 });

      expect(page.data).toHaveLength(2);
      expect(page.meta.limit).toBe(2);
      expect(page.meta.total).toBeGreaterThan(2);
      expect(page.meta.totalPages).toBe(Math.ceil(page.meta.total / 2));
    });
  });

  describe('filtres du contrat', () => {
    it('filtre par catégorie', async () => {
      const page = await lister({ category: 'thes' });

      expect(page.data).not.toHaveLength(0);
      expect(page.data.every((p) => p.category.slug === 'thes')).toBe(true);
    });

    it('filtre par type', async () => {
      const page = await lister({ type: 'COFFEE', limit: 100 });

      expect(page.data).not.toHaveLength(0);
      expect(page.data.every((p) => p.type === 'COFFEE')).toBe(true);
    });

    it('filtre par tranche de prix, bornes comprises', async () => {
      const page = await lister({ minPriceCents: 1500, maxPriceCents: 2500, limit: 100 });

      expect(page.data).not.toHaveLength(0);
      expect(page.data.every((p) => p.fromPriceCents >= 1500 && p.fromPriceCents <= 2500)).toBe(
        true,
      );
      // La borne basse est bien incluse : un produit à 1500 exactement y figure.
      expect(page.data.map((p) => p.fromPriceCents)).toContain(1500);
    });

    it('écarte les produits en rupture quand `inStock` est demandé', async () => {
      expect(await slugs({ inStock: true, limit: 100 })).not.toContain('kenya-aa');
      // Sans le filtre, le produit épuisé reste visible : il existe au catalogue.
      expect(await slugs({ limit: 100 })).toContain('kenya-aa');
    });

    it('cherche sur le nom, sans tenir compte des accents ni de la casse', async () => {
      expect(await slugs({ q: 'ETHIOPIE' })).toEqual(['ethiopie-yirgacheffe']);
      expect(await slugs({ q: 'déCAfé' })).toEqual(['decafeine-perou']);
    });
  });

  describe('filtres hors contrat', () => {
    it('filtre par moment de la journée', async () => {
      const page = await lister({ moment: 'EVENING', limit: 100 });

      expect(page.data).not.toHaveLength(0);
      expect(page.data.every((p) => p.moment === 'EVENING')).toBe(true);
    });

    it('filtre par teneur en caféine', async () => {
      const sansCafeine = await slugs({ caffeine: 'NONE', limit: 100 });

      expect(sansCafeine).toEqual(['decafeine-perou']);
    });
  });

  describe('tri', () => {
    it('ordonne par prix croissant puis décroissant', async () => {
      // Sur le catalogue entier : comparer deux premières pages ne dirait rien.
      const croissant = (await lister({ sort: 'price_asc', limit: 100 })).data.map(
        (p) => p.fromPriceCents,
      );
      const decroissant = (await lister({ sort: 'price_desc', limit: 100 })).data.map(
        (p) => p.fromPriceCents,
      );

      expect(croissant).toEqual([...croissant].sort((a, b) => a - b));
      expect(decroissant).toEqual([...croissant].reverse());
    });

    it('ordonne par nom en respectant les accents du français', async () => {
      const noms = (await lister({ sort: 'name_asc', limit: 100 })).data.map((p) => p.name);

      expect(noms).toEqual([...noms].sort((a, b) => a.localeCompare(b, 'fr')));
    });
  });

  // Les deux critères de validation du ticket SCRUM-66.
  describe('combiner deux filtres puis en retirer un', () => {
    it('restreint en combinant, et élargit quand on en retire un', async () => {
      const thes = await slugs({ category: 'thes', limit: 100 });
      const thesCorses = await slugs({ category: 'thes', caffeine: 'HIGH', limit: 100 });

      expect(thesCorses).toEqual(['matcha-ceremonie']);
      expect(thes.length).toBeGreaterThan(thesCorses.length);
      expect(thes).toEqual(expect.arrayContaining(thesCorses));

      // On retire la catégorie : le filtre restant continue de s'appliquer seul.
      const corses = await slugs({ caffeine: 'HIGH', limit: 100 });
      expect(corses).toEqual(expect.arrayContaining(thesCorses));
      expect(corses.length).toBeGreaterThan(thesCorses.length);
    });
  });

  describe('lecture d’un produit', () => {
    it('renvoie le produit demandé par son slug', async () => {
      const produit = await firstValueFrom(service.getBySlug('matcha-ceremonie'));

      expect(produit.name).toBe('Matcha cérémonie');
      expect(produit.fromPriceCents).toBe(2400);
    });

    it('répond 404 pour un slug inconnu', async () => {
      await expect(firstValueFrom(service.getBySlug('inexistant'))).rejects.toBeTruthy();
    });

    it('répond 404 pour un produit non publié, sans révéler son existence', async () => {
      try {
        await firstValueFrom(service.getBySlug('oolong-de-printemps'));
        throw new Error('la requête aurait dû échouer');
      } catch (erreur) {
        const api = toApiError(erreur);
        expect(api.statusCode).toBe(404);
        expect(api.message).not.toContain('Oolong');
      }
    });
  });

  // Critère 3 d'US-001.
  describe('parcours des lots', () => {
    it('ne duplique ni ne saute de produit d’un lot à l’autre', async () => {
      const premiere = await lister({ limit: 5, page: 1 });
      const total = premiere.meta.total;
      const pages = premiere.meta.totalPages;

      const parcourus: string[] = [];
      for (let page = 1; page <= pages; page += 1) {
        parcourus.push(...(await lister({ limit: 5, page })).data.map((p) => p.slug));
      }

      expect(parcourus).toHaveLength(total);
      expect(new Set(parcourus).size).toBe(total);

      const entier = await lister({ limit: 100 });
      expect([...parcourus].sort()).toEqual(entier.data.map((p) => p.slug).sort());
    });

    it('garde le même ordre d’un lot à l’autre sous un tri donné', async () => {
      const entier = (await lister({ sort: 'price_asc', limit: 100 })).data.map((p) => p.slug);

      const parLots: string[] = [];
      for (let page = 1; page <= Math.ceil(entier.length / 4); page += 1) {
        parLots.push(
          ...(await lister({ sort: 'price_asc', limit: 4, page })).data.map((p) => p.slug),
        );
      }

      expect(parLots).toEqual(entier);
    });

    it('renvoie un lot vide au-delà de la dernière page, sans erreur', async () => {
      const page = await lister({ limit: 5, page: 99 });

      expect(page.data).toEqual([]);
      expect(page.meta.total).toBeGreaterThan(0);
    });
  });

  describe('combinaison vide', () => {
    it('renvoie une page vide, pas une erreur', async () => {
      const page = await lister({ category: 'accessoires', caffeine: 'HIGH' });

      expect(page.data).toEqual([]);
      expect(page.meta.total).toBe(0);
      // `totalPages` reste à 1 : une liste vide a une page, qui est vide.
      expect(page.meta.totalPages).toBe(1);
    });
  });

  describe('valeur de filtre non autorisée', () => {
    it('refuse un type inconnu avec une VALIDATION_ERROR', async () => {
      const erreur = await echec({ type: 'TISANE' as never });

      expect(erreur.statusCode).toBe(400);
      expect(erreur.code).toBe('VALIDATION_ERROR');
      expect(erreur.fieldErrors['type']).toBeDefined();
    });

    it('refuse un tri, un moment et une caféine inconnus', async () => {
      expect((await echec({ sort: 'price' as never })).fieldErrors['sort']).toBeDefined();
      expect((await echec({ moment: 'NUIT' as never })).fieldErrors['moment']).toBeDefined();
      expect(
        (await echec({ caffeine: 'BEAUCOUP' as never })).fieldErrors['caffeine'],
      ).toBeDefined();
    });

    it('refuse une catégorie qui n’existe pas', async () => {
      expect((await echec({ category: 'tisanes' })).fieldErrors['category']).toBeDefined();
    });

    it('refuse une pagination hors bornes', async () => {
      expect((await echec({ page: 0 })).fieldErrors['page']).toBeDefined();
      expect((await echec({ limit: 101 })).fieldErrors['limit']).toBeDefined();
      expect((await echec({ minPriceCents: -1 })).fieldErrors['minPriceCents']).toBeDefined();
    });

    it('valide avant de filtrer : une valeur refusée ne renvoie aucun résultat partiel', async () => {
      const erreur = await echec({ category: 'thes', type: 'TISANE' as never });

      expect(erreur.code).toBe('VALIDATION_ERROR');
      expect(Object.keys(erreur.fieldErrors)).toEqual(['type']);
    });
  });
});

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
    it('renvoie le catalogue et exclut les produits archivés', async () => {
      const page = await lister();

      expect(page.data).not.toHaveLength(0);
      expect(page.data.map((p) => p.slug)).not.toContain('darjeeling-printemps-2025');
      expect(page.meta.total).toBe(page.data.length);
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
      expect(await slugs({ type: 'COFFEE' })).toEqual(['ethiopie-moka-sidamo']);
    });

    it('filtre par tranche de prix, bornes comprises', async () => {
      const page = await lister({ minPriceCents: 790, maxPriceCents: 1490 });

      expect(page.data.map((p) => p.fromPriceCents).sort((a, b) => a - b)).toEqual([
        790, 990, 1490, 1490,
      ]);
    });

    it('écarte les produits en rupture quand `inStock` est demandé', async () => {
      expect(await slugs({ inStock: true })).not.toContain('sencha-bio');
      expect(await slugs()).toContain('sencha-bio');
    });

    it('cherche sur le nom, sans tenir compte des accents ni de la casse', async () => {
      expect(await slugs({ q: 'IMPERIAL' })).toEqual(['earl-grey-imperial']);
    });
  });

  describe('filtres hors contrat', () => {
    it('filtre par moment de la journée', async () => {
      expect(await slugs({ moment: 'EVENING' })).toEqual(['fleurs-cbd-amnesia']);
    });

    it('filtre par teneur en caféine', async () => {
      const sansCafeine = await slugs({ caffeine: 'NONE' });

      expect(sansCafeine).toContain('fleurs-cbd-amnesia');
      expect(sansCafeine).not.toContain('earl-grey-imperial');
    });
  });

  describe('tri', () => {
    it('ordonne par prix croissant puis décroissant', async () => {
      const croissant = (await lister({ sort: 'price_asc' })).data.map((p) => p.fromPriceCents);
      const decroissant = (await lister({ sort: 'price_desc' })).data.map((p) => p.fromPriceCents);

      expect(croissant).toEqual([...croissant].sort((a, b) => a - b));
      expect(decroissant).toEqual([...croissant].reverse());
    });

    it('ordonne par nom en respectant les accents du français', async () => {
      const noms = (await lister({ sort: 'name_asc' })).data.map((p) => p.name);

      expect(noms).toEqual([...noms].sort((a, b) => a.localeCompare(b, 'fr')));
    });
  });

  // Les deux critères de validation du ticket SCRUM-66.
  describe('combiner deux filtres puis en retirer un', () => {
    it('restreint en combinant, et élargit quand on en retire un', async () => {
      const thes = await slugs({ category: 'thes' });
      const thesCorses = await slugs({ category: 'thes', caffeine: 'HIGH' });

      expect(thesCorses).toEqual(['earl-grey-imperial']);
      expect(thes.length).toBeGreaterThan(thesCorses.length);
      expect(thes).toEqual(expect.arrayContaining(thesCorses));

      // On retire la catégorie : le filtre restant continue de s'appliquer seul.
      const corses = await slugs({ caffeine: 'HIGH' });
      expect(corses).toEqual(expect.arrayContaining(thesCorses));
      expect(corses.length).toBeGreaterThan(thesCorses.length);
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

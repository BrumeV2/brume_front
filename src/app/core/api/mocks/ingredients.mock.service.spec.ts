import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';

import { toApiError, type ApiError } from '../api-error';
import type { IngredientListItem } from '../api.types';
import { ingredientCorrespond, synonymesTrouves } from '../product-search';
import { IngredientsMockService } from './ingredients.mock.service';
import { PRODUCTS_MOCK_OPTIONS } from './products.mock.service';

describe('IngredientsMockService (US-015)', () => {
  let service: IngredientsMockService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        IngredientsMockService,
        { provide: PRODUCTS_MOCK_OPTIONS, useValue: { delayMs: 0, failFirstSearches: 0 } },
      ],
    });
    service = TestBed.inject(IngredientsMockService);
  });

  const chercher = (q: string): Promise<IngredientListItem[]> => firstValueFrom(service.search(q));
  const noms = async (q: string): Promise<string[]> => (await chercher(q)).map((i) => i.name);
  const echec = async (q: string): Promise<ApiError> => {
    try {
      await chercher(q);
    } catch (erreur) {
      return toApiError(erreur);
    }
    throw new Error('la recherche aurait dû échouer');
  };

  describe('référentiel complet', () => {
    it('renvoie tout le référentiel trié par nom, ingrédients sans produit compris', async () => {
      const referentiel = await firstValueFrom(service.all());
      const tries = [...referentiel].sort((a, b) => a.name.localeCompare(b.name, 'fr'));

      expect(referentiel.map((i) => i.name)).toEqual(tries.map((i) => i.name));
      expect(referentiel.find((i) => i.name === 'Hibiscus')?.productCount).toBe(0);
    });

    it('compte les produits publiés contenant chaque ingrédient', async () => {
      const referentiel = await firstValueFrom(service.all());
      const compte = (nom: string): number | undefined =>
        referentiel.find((i) => i.name === nom)?.productCount;

      // Présent dans quatre thés sur sept : une partie seulement de la gamme.
      expect(compte('Thé vert')).toBe(4);
      expect(compte('Café robusta')).toBe(1);
      // Seul l'oolong non publié en contient : il ne compte pas.
      expect(compte('Oolong')).toBe(0);
    });
  });

  describe('règle de synonymes', () => {
    it('trouve un ingrédient par son synonyme', async () => {
      expect(await noms('badiane')).toEqual(['Anis étoilé']);
      expect(await noms('bissap')).toEqual(['Hibiscus']);
    });

    it('ignore casse et accents, côté saisie comme côté référentiel', async () => {
      expect(await noms('BADIANE')).toEqual(['Anis étoilé']);
      expect(await noms('anis etoile')).toEqual(['Anis étoilé']);
      expect(await noms('karkade')).toEqual(['Hibiscus']);
    });

    it('cherche en sous-chaîne, chaque mot devant figurer dans le nom ou un synonyme', async () => {
      expect(await noms('thé')).toEqual(expect.arrayContaining(['Thé vert', 'Thé noir']));
      // Limite assumée du back : l'oolong a pour synonyme « thé bleu-vert ».
      expect(await noms('the vert')).toEqual(['Oolong', 'Thé vert']);
      expect(await noms('vert noir')).toEqual([]);
    });

    it('renvoie une liste vide pour un ingrédient inconnu', async () => {
      expect(await chercher('licorne')).toEqual([]);
    });

    it('explique la suggestion par le synonyme trouvé, pas quand le nom suffit', () => {
      const anis = { name: 'Anis étoilé', aliases: ['badiane'] };

      expect(synonymesTrouves(anis, 'Badiane')).toEqual(['badiane']);
      expect(synonymesTrouves(anis, 'anis')).toEqual([]);
      expect(ingredientCorrespond(anis, 'étoilé badiane')).toBe(true);
      expect(ingredientCorrespond(anis, 'anis cannelle')).toBe(false);
    });
  });

  describe('validation de q', () => {
    it('refuse une recherche de moins de deux caractères, espaces retirés', async () => {
      const erreur = await echec('  a  ');

      expect(erreur.code).toBe('VALIDATION_ERROR');
      expect(erreur.fieldErrors['q']).toBeDefined();
    });

    it('refuse une recherche de plus de 100 caractères', async () => {
      expect((await echec('a'.repeat(101))).code).toBe('VALIDATION_ERROR');
    });
  });
});

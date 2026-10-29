import type { ActivatedRouteSnapshot, Params } from '@angular/router';
import { describe, expect, it } from 'vitest';

import { genreDeTransition } from './page-transition';

/** Arbre de routes minimal : racine sans segment, puis un enfant par segment de chemin. */
function page(chemin: string, queryParams: Params = {}): ActivatedRouteSnapshot {
  const enfants = chemin
    .split('/')
    .filter(Boolean)
    .reduceRight<ActivatedRouteSnapshot | null>(
      (suivant, segment) =>
        ({
          url: [{ path: segment }],
          firstChild: suivant,
          queryParams,
        }) as unknown as ActivatedRouteSnapshot,
      null,
    );
  return { url: [], firstChild: enfants, queryParams } as unknown as ActivatedRouteSnapshot;
}

describe('genreDeTransition', () => {
  it('fait un fondu entre deux pages différentes', () => {
    expect(genreDeTransition(page(''), page('boutique'))).toBe('fondu');
    expect(genreDeTransition(page('compte'), page('compte/profil'))).toBe('fondu');
  });

  it('fait glisser le catalogue dans le sens des univers', () => {
    const thes = page('boutique', { category: 'thes' });
    const cafes = page('boutique', { category: 'cafes' });
    const cbd = page('boutique', { category: 'cbd' });

    expect(genreDeTransition(thes, cafes)).toBe('glisse-gauche');
    expect(genreDeTransition(page('boutique'), cbd)).toBe('glisse-gauche');
    expect(genreDeTransition(cbd, thes)).toBe('glisse-droite');
  });

  it('n’anime pas un simple changement de filtre ou de tri', () => {
    expect(
      genreDeTransition(
        page('boutique', { category: 'thes' }),
        page('boutique', { category: 'thes', sort: 'prix' }),
      ),
    ).toBe('aucune');
    expect(genreDeTransition(page('compte/profil'), page('compte/profil'))).toBe('aucune');
  });
});

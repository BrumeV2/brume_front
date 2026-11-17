import { describe, expect, it } from 'vitest';

import { PricePipe } from './price-pipe';

// Intl sépare le montant et « € » par une espace insécable fine : on la normalise.
const prix = (cents: number | null | undefined) =>
  new PricePipe().transform(cents).replace(/\s/g, ' ');

describe('PricePipe', () => {
  it('affiche un prix rond sans décimales', () => {
    expect(prix(2400)).toBe('24 €');
  });

  it('affiche les centimes quand il y en a', () => {
    expect(prix(1290)).toBe('12,90 €');
    expect(prix(5)).toBe('0,05 €');
  });

  it('sépare les milliers à la française', () => {
    expect(prix(123400)).toBe('1 234 €');
  });

  // US-024 : arrondis monétaires. L'API donne des centimes entiers ; le pipe ne
  // fait que les mettre en forme, sans perdre ni ajouter un centime.
  it('restitue chaque centime d’un total à quantités multiples', () => {
    expect(prix(1290 * 3)).toBe('38,70 €');
    expect(prix(4999)).toBe('49,99 €');
    expect(prix(10)).toBe('0,10 €');
    expect(prix(1)).toBe('0,01 €');
    expect(prix(100)).toBe('1 €');
  });

  it('n’affiche rien sans montant', () => {
    expect(prix(null)).toBe('');
    expect(prix(undefined)).toBe('');
    expect(prix(Number.NaN)).toBe('');
  });
});

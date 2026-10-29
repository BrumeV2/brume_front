import { firstValueFrom } from 'rxjs';
import { describe, expect, it } from 'vitest';

import { HomeMockService } from './home.mock.service';

const noms = (produits: readonly { name: string }[]) => produits.map((p) => p.name);

describe('HomeMockService', () => {
  const service = new HomeMockService();

  it('sert la vitrine de la maquette Figma en version neutre', async () => {
    const vitrine = await firstValueFrom(service.getShowcase(null));

    expect(noms(vitrine.favorites)).toEqual([
      'Matcha cérémonie',
      'Espresso maison',
      'Earl grey au chanvre',
      'Long Jing',
    ]);
    expect(vitrine.moments.map((m) => m.hour)).toEqual(['8h', '12h', '16h', '21h']);
  });

  it('met le café en avant côté café, le thé côté thé', async () => {
    const cafe = await firstValueFrom(service.getShowcase('cafe'));
    const the = await firstValueFrom(service.getShowcase('the'));

    expect(cafe.favorites[0].name).toBe('Espresso maison');
    expect(cafe.moments[3].product.name).toBe('Décaféiné Pérou');
    expect(the.favorites[0].name).toBe('Matcha cérémonie');
    expect(the.moments[2].product.name).toBe('Chaï maison');
  });

  it('donne des prix en centimes et une photo locale à chaque produit', async () => {
    for (const side of [null, 'the', 'cafe'] as const) {
      const vitrine = await firstValueFrom(service.getShowcase(side));
      for (const produit of [...vitrine.favorites, ...vitrine.moments.map((m) => m.product)]) {
        expect(Number.isInteger(produit.priceCents)).toBe(true);
        expect(produit.image).toMatch(/^images\/produits\/[a-z-]+\.jpg$/);
      }
    }
  });
});

import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { firstValueFrom, of, throwError, type Observable } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Cart, UserProfile } from '../../../../core/api/api.types';
import { CartService } from '../../../../core/api/cart.service';
import { ProductsMockService } from '../../../../core/api/mocks/products.mock.service';
import { UsersMockService } from '../../../../core/api/mocks/users.mock.service';
import { ProductsService } from '../../../../core/api/products.service';
import { UsersService } from '../../../../core/api/users.service';
import { CartStore } from '../../../../core/state/cart.store';
import { provideCartForTests } from '../../../../core/state/cart.testing';
import { checkoutRoutes } from '../../checkout.routes';

@Component({ template: '' })
class Page {}

class Visiteur extends UsersService {
  override getMe(): Observable<UserProfile> {
    return throwError(() => new HttpErrorResponse({ status: 401 }));
  }
  override updateMe(): Observable<UserProfile> {
    return throwError(() => new HttpErrorResponse({ status: 401 }));
  }
}

describe('Checkout (US-025)', () => {
  let harness: RouterTestingHarness;

  const configurer = (users: typeof UsersService = UsersMockService): void => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'commande', children: checkoutRoutes },
          { path: 'connexion', component: Page },
        ]),
        provideCartForTests(),
        { provide: UsersService, useClass: users },
        { provide: ProductsService, useClass: ProductsMockService },
      ],
    });
  };

  const attendre = async (): Promise<void> => {
    await new Promise((resoudre) => setTimeout(resoudre, 900));
    await harness.fixture.whenStable();
    harness.detectChanges();
  };

  const ouvrir = async (): Promise<HTMLElement> => {
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/commande');
    await attendre();
    return harness.routeNativeElement as HTMLElement;
  };

  const texte = (racine: HTMLElement, selecteur: string): string =>
    (racine.querySelector(selecteur)?.textContent ?? '').replace(/\s+/g, ' ').trim();

  const remplir = async (quantite = 2): Promise<void> => {
    const matcha = await firstValueFrom(
      TestBed.inject(ProductsService).getBySlug('matcha-ceremonie'),
    );
    const [boite] = matcha.variants;
    if (boite === undefined) throw new Error('format absent');
    await TestBed.inject(CartStore).add(matcha, boite, quantite);
  };

  describe('client connecté', () => {
    beforeEach(() => configurer());

    // Validation n°1 : panier valide.
    it('entre dans la commande avec un panier confirmé', async () => {
      await remplir();
      const page = await ouvrir();

      expect([...page.querySelectorAll('.etape__titre')].map((e) => e.textContent?.trim())).toEqual(
        ['01 Tes coordonnées', '02 Livraison', '03 Paiement'],
      );
      expect(texte(page, '.recap__ligne')).toContain('Matcha cérémonie');
      expect(texte(page, '.recap__ligne')).toContain('Boîte 50 g · ×2');
      expect(texte(page, '.recap__montants')).toContain('48');
      // US-024 : livraison et total encore inconnus, annoncés comme tels.
      expect(texte(page, '.recap__montants')).toContain('À choisir à l’étape 02');
      expect(texte(page, '.recap__total')).toContain('Connu après le choix de la livraison');
    });

    // Validation n°1 : panier vide.
    it('n’entre pas dans la commande avec un panier vide', async () => {
      const page = await ouvrir();

      expect(texte(page, '.bloc__titre')).toBe('Ton panier est vide.');
      expect(page.querySelector('.etapes')).toBeNull();
    });

    // Validation n°2 : prix modifié avant validation, puis nouvelle demande.
    it('présente un changement de prix et attend une nouvelle confirmation', async () => {
      await remplir(1);
      // La lecture initiale du panier doit être passée avant que le prix change.
      TestBed.tick();
      await new Promise((resoudre) => setTimeout(resoudre, 450));
      const service = TestBed.inject(CartService);
      const actuel = await firstValueFrom(service.get());
      const augmente: Cart = {
        ...actuel,
        items: actuel.items.map((item) => ({
          ...item,
          unitPriceCents: 2600,
          lineTotalCents: 2600,
        })),
        itemsTotalCents: 2600,
      };
      vi.spyOn(service, 'get').mockReturnValue(of(augmente));

      const page = await ouvrir();

      expect(texte(page, '.bloc__titre')).toBe('Ton panier a changé depuis son affichage.');
      expect(texte(page, '.ecarts')).toContain('est passé de 24');
      expect(page.querySelector('.etapes')).toBeNull();

      // L'API renvoie de nouveau le même panier : il est confirmé.
      page.querySelector<HTMLButtonElement>('.bloc__actions button')?.click();
      await attendre();

      expect(page.querySelector('.etapes')).not.toBeNull();
      expect(texte(page, '.recap__montants')).toContain('26');
    });
  });

  it('renvoie un visiteur vers la connexion (compte obligatoire, D-013)', async () => {
    configurer(Visiteur);
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/commande');

    expect(TestBed.inject(Router).url).toBe('/connexion');
  });
});

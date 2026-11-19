import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { MOCK_DELAY_MS } from '../../core/api/mocks/mock-delay';
import { ProductsMockService } from '../../core/api/mocks/products.mock.service';
import { UsersMockService } from '../../core/api/mocks/users.mock.service';
import { ProductsService } from '../../core/api/products.service';
import { UsersService } from '../../core/api/users.service';
import { CartStore } from '../../core/state/cart.store';
import { provideCartForTests } from '../../core/state/cart.testing';
import { CartDrawer } from './cart-drawer';

@Component({ template: '' })
class Page {}

describe('CartDrawer', () => {
  let fixture: ComponentFixture<CartDrawer>;
  let panier: CartStore;

  beforeAll(() => {
    // jsdom ne sait pas ouvrir un <dialog> modal : on reproduit l'essentiel.
    const prototype = HTMLDialogElement.prototype;
    prototype.showModal ??= function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    };
    prototype.close ??= function (this: HTMLDialogElement) {
      this.removeAttribute('open');
      this.dispatchEvent(new Event('close'));
    };
  });

  const element = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const texte = (selecteur: string): string =>
    (element().querySelector(selecteur)?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const dialogue = (): HTMLDialogElement => element().querySelector('dialog') as HTMLDialogElement;

  const stabiliser = async (): Promise<void> => {
    await new Promise((resoudre) => setTimeout(resoudre, MOCK_DELAY_MS * 2 + 50));
    await fixture.whenStable();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [CartDrawer],
      providers: [
        provideRouter([
          { path: 'commande', component: Page },
          { path: 'boutique', component: Page },
        ]),
        provideCartForTests(),
        { provide: UsersService, useClass: UsersMockService },
        { provide: ProductsService, useClass: ProductsMockService },
      ],
    });
    panier = TestBed.inject(CartStore);
    panier.start();
    fixture = TestBed.createComponent(CartDrawer);
    fixture.detectChanges();
    await stabiliser();
  });

  it('reste fermé tant qu’on ne l’ouvre pas', () => {
    expect(dialogue().open).toBe(false);
  });

  it('propose la boutique quand le panier est vide', () => {
    panier.openDrawer();
    fixture.detectChanges();

    expect(dialogue().open).toBe(true);
    expect(texte('.vide__titre')).toBe('Rien à infuser.');
    expect(element().querySelector('.tiroir__bas a')?.getAttribute('href')).toBe('/boutique');
  });

  it('restitue l’état du panier après un ajout : lignes, quantité et sous-total de l’API', async () => {
    const matcha = await firstValueFrom(
      TestBed.inject(ProductsService).getBySlug('matcha-ceremonie'),
    );
    const boite = matcha.variants[0];
    if (boite === undefined) throw new Error('format absent');

    await panier.add(matcha, boite, 2);
    fixture.detectChanges();

    expect(dialogue().open).toBe(true);
    expect(texte('.tiroir__titre')).toBe('Ton panier (2)');
    expect(texte('.ligne__nom')).toBe('Matcha cérémonie');
    expect(texte('.ligne')).toContain('Boîte 50 g');
    expect(texte('.ligne output')).toBe('2');
    expect(texte('.ligne')).toContain('Vient d’être ajouté');
    expect(texte('.montants__sous-total dd')).toContain('48');
    expect(texte('.montants')).toContain('Calculée à l’étape suivante');
  });

  describe('avec un panier', () => {
    const remplir = async (): Promise<void> => {
      const produits = TestBed.inject(ProductsService);
      const matcha = await firstValueFrom(produits.getBySlug('matcha-ceremonie'));
      const sencha = await firstValueFrom(produits.getBySlug('sencha-du-matin'));
      const [boiteMatcha] = matcha.variants;
      const [boiteSencha] = sencha.variants;
      if (boiteMatcha === undefined || boiteSencha === undefined)
        throw new Error('formats absents');
      await panier.add(matcha, boiteMatcha, 1);
      await panier.add(sencha, boiteSencha, 1);
      fixture.detectChanges();
    };

    const cliquer = (selecteur: string, index = 0): void => {
      element().querySelectorAll<HTMLButtonElement>(selecteur)[index]?.click();
      fixture.detectChanges();
    };

    beforeEach(remplir);

    // US-022 : contrôle par ligne et total confirmé.
    it('marque le sous-total « en cours » puis affiche celui confirmé par l’API', async () => {
      cliquer('[aria-label="Ajouter un exemplaire"]');

      expect(texte('.ligne output')).toBe('2');
      expect(texte('.tiroir__note')).toBe('Mise à jour du sous-total…');
      expect(element().querySelector('.ligne')?.getAttribute('aria-busy')).toBe('true');

      await stabiliser();

      expect(texte('.montants__sous-total dd')).toContain('63');
      expect(texte('.tiroir__note')).toContain('Taxes incluses');
      expect(texte('.tiroir__commander')).toContain('Commander · 63');
    });

    // US-023 : suppression par ligne, puis panier vide.
    it('retire une ligne puis la dernière, jusqu’à l’état vide', async () => {
      cliquer('.ligne__retirer');
      expect(texte('.ligne__retirer')).toBe('Retrait…');
      await stabiliser();

      expect(element().querySelectorAll('.ligne')).toHaveLength(1);
      expect(texte('.montants__sous-total dd')).toContain('15');

      cliquer('.ligne__retirer');
      await stabiliser();

      expect(texte('.vide__titre')).toBe('Rien à infuser.');
      expect(texte('.tiroir__titre')).toBe('Ton panier');
    });

    // US-025 : entrée dans la commande avec un panier valide.
    it('« Commander » relit le panier et ouvre la commande', async () => {
      cliquer('.tiroir__commander button');
      await stabiliser();

      expect(TestBed.inject(Router).url).toBe('/commande');
      expect(panier.isDrawerOpen()).toBe(false);
    });
  });

  it('se ferme et le fait savoir au panier', () => {
    panier.openDrawer();
    fixture.detectChanges();

    element().querySelector<HTMLButtonElement>('.tiroir__fermer')?.click();
    fixture.detectChanges();

    expect(panier.isDrawerOpen()).toBe(false);
    expect(dialogue().open).toBe(false);
  });
});

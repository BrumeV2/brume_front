import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { ProductsMockService } from '../../core/api/mocks/products.mock.service';
import { UsersMockService } from '../../core/api/mocks/users.mock.service';
import { ProductsService } from '../../core/api/products.service';
import { UsersService } from '../../core/api/users.service';
import { CartStore } from '../../core/state/cart.store';
import { provideCartForTests } from '../../core/state/cart.testing';
import { SiteHeader } from './site-header';

@Component({ template: '' })
class Page {}

describe('SiteHeader', () => {
  let fixture: ComponentFixture<SiteHeader>;
  let router: Router;

  beforeAll(() => {
    // jsdom ne sait pas ouvrir un <dialog> modal : on reproduit l'essentiel.
    const prototype = HTMLDialogElement.prototype;
    prototype.showModal ??= function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    };
    prototype.close ??= function (this: HTMLDialogElement) {
      this.removeAttribute('open');
    };
  });

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function libellesDesLiens(selecteur: string): string[] {
    return [...element().querySelectorAll<HTMLAnchorElement>(`${selecteur} a`)].map(
      (lien) => lien.textContent?.trim() ?? '',
    );
  }

  function defilerA(y: number): void {
    Object.defineProperty(window, 'scrollY', { value: y, configurable: true });
    window.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SiteHeader],
      providers: [
        provideRouter([
          { path: '', component: Page },
          { path: 'boutique', component: Page },
          { path: 'compte', component: Page },
        ]),
        { provide: UsersService, useClass: UsersMockService },
        { provide: ProductsService, useClass: ProductsMockService },
        provideCartForTests(),
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(SiteHeader);
    fixture.detectChanges();
  });

  afterEach(() => defilerA(0));

  it('ne propose que des pages livrées : les univers du catalogue, le compte et le panier', () => {
    expect(libellesDesLiens('.menu')).toEqual(['Thés', 'Cafés', 'CBD', 'BRUME', 'Compte']);
    expect(element().querySelector('.menu__panier')).not.toBeNull();
    expect(element().textContent).not.toMatch(/TEA-BOX|TeaOMatic|Bataille/);
  });

  // US-021 : le compteur suit le panier, et le bouton ouvre le tiroir.
  describe('panier', () => {
    const compteur = (): string =>
      element().querySelector('.menu__compteur')?.textContent?.trim() ?? '';

    it('affiche le nombre d’articles, et l’annonce aux lecteurs d’écran', () => {
      expect(compteur()).toBe('0');
      expect(element().querySelector('.menu__panier')?.getAttribute('aria-label')).toBe(
        'Panier, 0 article',
      );
    });

    it('ouvre le tiroir du panier', () => {
      const panier = TestBed.inject(CartStore);
      element().querySelector<HTMLButtonElement>('.menu__panier')?.click();

      expect(panier.isDrawerOpen()).toBe(true);
    });
  });

  it('indique la page active, univers compris', async () => {
    await router.navigateByUrl('/boutique?category=cafes&sort=prix');
    fixture.detectChanges();

    const actifs = [...element().querySelectorAll('.menu [aria-current="page"]')].map((lien) =>
      lien.textContent?.trim(),
    );
    expect(actifs).toEqual(['Cafés']);
  });

  it('reste plein sur une page sans photo en haut', () => {
    expect(element().classList.contains('est-plein')).toBe(true);
  });

  it('transparent sur une photo, il devient plein dès qu’on fait défiler', () => {
    fixture.componentRef.setInput('transparent', true);
    fixture.detectChanges();
    expect(element().classList.contains('est-plein')).toBe(false);

    defilerA(200);
    expect(element().classList.contains('est-plein')).toBe(true);

    defilerA(0);
    expect(element().classList.contains('est-plein')).toBe(false);
  });

  it('ouvre le menu mobile, puis le referme après une navigation', async () => {
    const panneau = element().querySelector('dialog');
    element().querySelector<HTMLButtonElement>('.menu__ouvrir')?.click();
    expect(panneau?.open).toBe(true);
    expect(libellesDesLiens('.panneau__liens')).toEqual([
      'Accueil',
      'Thés',
      'Cafés',
      'CBD',
      'Compte',
    ]);

    await router.navigateByUrl('/compte');
    expect(panneau?.open).toBe(false);
  });

  it('propose un lien d’évitement vers le contenu', () => {
    expect(element().querySelector('.evitement')?.getAttribute('href')).toBe('#contenu');
  });
});

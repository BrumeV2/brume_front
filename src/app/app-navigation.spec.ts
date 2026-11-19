import { ViewportScroller } from '@angular/common';
import { ApplicationRef, ComponentRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  NavigationEnd,
  Router,
  Scroll,
  provideRouter,
  withComponentInputBinding,
  withDisabledInitialNavigation,
  withInMemoryScrolling,
} from '@angular/router';
import { filter, firstValueFrom, of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { App } from './app';
import { routes } from './app.routes';
import { CartService } from './core/api/cart.service';
import { IngredientsService } from './core/api/ingredients.service';
import { CartMockService } from './core/api/mocks/cart.mock.service';
import { IngredientsMockService } from './core/api/mocks/ingredients.mock.service';
import { PRODUCTS_MOCK_OPTIONS, ProductsMockService } from './core/api/mocks/products.mock.service';
import { UsersMockService } from './core/api/mocks/users.mock.service';
import { ProductsService } from './core/api/products.service';
import { SessionService } from './core/api/session.service';
import { UsersService } from './core/api/users.service';

/** Bootstrap réel : initialise aussi le défilement automatique du routeur. */
describe('Navigation : recherche et défilement', () => {
  let application: ApplicationRef;
  let composant: ComponentRef<App>;
  let racine: HTMLElement;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideRouter(
          routes,
          withDisabledInitialNavigation(),
          withComponentInputBinding(),
          withInMemoryScrolling({
            scrollPositionRestoration: 'enabled',
            anchorScrolling: 'enabled',
          }),
        ),
        // `App` monte le tiroir du panier (US-021) : sans ce service, le
        // composant racine ne peut pas être construit.
        { provide: CartService, useClass: CartMockService },
        { provide: ProductsService, useClass: ProductsMockService },
        { provide: IngredientsService, useClass: IngredientsMockService },
        { provide: PRODUCTS_MOCK_OPTIONS, useValue: { delayMs: 0, failFirstSearches: 0 } },
        { provide: UsersService, useClass: UsersMockService },
        { provide: SessionService, useValue: { logout: () => of(undefined) } },
      ],
    }).compileComponents();
    racine = document.createElement('app-root');
    document.body.appendChild(racine);
    application = TestBed.inject(ApplicationRef);
    composant = application.bootstrap(App, racine);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    composant?.destroy();
    racine?.remove();
  });

  const defilementTermine = (url: string) =>
    firstValueFrom(
      router.events.pipe(
        filter(
          (e) =>
            e instanceof Scroll &&
            e.routerEvent instanceof NavigationEnd &&
            e.routerEvent.urlAfterRedirects === url,
        ),
      ),
    );

  const ouvrir = async (url: string) => {
    const defilement = defilementTermine(url);
    await router.navigateByUrl(url);
    await defilement;
    await application.whenStable();
  };

  it('conserve le défilement et le focus pendant une recherche dynamique', async () => {
    const defilement = TestBed.inject(ViewportScroller);
    const position = vi.spyOn(defilement, 'scrollToPosition').mockImplementation(() => undefined);
    const ancre = vi.spyOn(defilement, 'scrollToAnchor').mockImplementation(() => undefined);
    await ouvrir('/boutique');
    expect(position).toHaveBeenCalledWith([0, 0]);
    position.mockClear();
    const champ = racine.querySelector<HTMLInputElement>('input[type="search"]')!;
    champ.focus();
    const navigation = defilementTermine('/boutique?q=maison');
    champ.value = 'maison';
    champ.dispatchEvent(new Event('input', { bubbles: true }));
    await navigation;
    await application.whenStable();
    expect(position).not.toHaveBeenCalled();
    expect(ancre).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(champ);
    await vi.waitFor(() => {
      application.tick();
      expect(racine.querySelectorAll('app-ui-product-card')).toHaveLength(2);
    });
    expect(position).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(champ);
  });

  it('remonte et replace le focus sur le contenu quand on change de page', async () => {
    const position = vi
      .spyOn(TestBed.inject(ViewportScroller), 'scrollToPosition')
      .mockImplementation(() => undefined);
    await ouvrir('/boutique');
    position.mockClear();
    await ouvrir('/une-autre-page');
    expect(position).toHaveBeenCalledWith([0, 0]);
    expect(document.activeElement).toBe(racine.querySelector('#contenu'));
  });
});

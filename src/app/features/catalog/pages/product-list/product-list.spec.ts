import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Observable, throwError } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';

import type { CatalogPage, CatalogProduct, Category } from '../../../../core/api/api.types';
import { ProductsMockService } from '../../../../core/api/mocks/products.mock.service';
import { ProductsService } from '../../../../core/api/products.service';
import { catalogRoutes } from '../../catalog.routes';

/** API injoignable : aucune requête n'aboutit. */
class ApiMuette extends ProductsService {
  private readonly panne = (): Observable<never> =>
    throwError(() => new HttpErrorResponse({ status: 0, statusText: 'Unknown Error' }));

  override list(): Observable<CatalogPage> {
    return this.panne();
  }
  override categories(): Observable<Category[]> {
    return this.panne();
  }
  override getBySlug(): Observable<CatalogProduct> {
    return this.panne();
  }
}

/**
 * L'écran est branché sur l'implémentation simulée, pas sur un double : ce qui
 * est vérifié ici, c'est l'enchaînement complet URL → requête → affichage, avec
 * la même validation que celle du back.
 */
describe('ProductList', () => {
  let harness: RouterTestingHarness;
  let router: Router;

  const configurer = (service: typeof ProductsService): void => {
    TestBed.configureTestingModule({
      providers: [
        // Comme dans `app.config.ts` : sans cette option, les paramètres de
        // requête n'arrivent pas aux entrées de l'écran.
        provideRouter([{ path: 'boutique', children: catalogRoutes }], withComponentInputBinding()),
        { provide: ProductsService, useClass: service },
      ],
    });
  };

  beforeEach(() => configurer(ProductsMockService));

  const stabiliser = async (): Promise<void> => {
    // Les réponses simulées sont temporisées : on laisse passer la latence.
    await new Promise((resoudre) => setTimeout(resoudre, 500));
    await harness.fixture.whenStable();
    harness.detectChanges();
  };

  const afficher = async (url: string): Promise<HTMLElement> => {
    harness = await RouterTestingHarness.create();
    router = TestBed.inject(Router);
    await harness.navigateByUrl(url);
    await stabiliser();
    return harness.routeNativeElement as HTMLElement;
  };

  const ecran = (): HTMLElement => harness.routeNativeElement as HTMLElement;

  // `textContent` et non `innerText` : jsdom ne calcule pas de rendu, donc
  // `innerText` y vaut toujours `undefined`.
  const textes = (racine: HTMLElement, selecteur: string): string[] =>
    [...racine.querySelectorAll(selecteur)].map((element) =>
      (element.textContent ?? '').replace(/\s+/g, ' ').trim(),
    );

  const noms = (racine: HTMLElement): string[] => textes(racine, '.carte__nom');

  describe('consulter le catalogue', () => {
    it('range les produits par univers quand aucun filtre n’est posé', async () => {
      const page = await afficher('/boutique');

      const univers = textes(page, 'app-universe-section .entete__titre');
      expect(univers.length).toBeGreaterThan(1);
      expect(univers[0]).toContain('Thés');
      // Pas de grille unique : chaque univers a la sienne.
      expect(page.querySelector('.resultats > .grille')).toBeNull();
    });

    it('donne à chaque produit son nom, son prix et son visuel', async () => {
      const page = await afficher('/boutique?category=thes');

      const cartes = [...page.querySelectorAll('app-ui-product-card')];
      expect(cartes.length).toBeGreaterThan(0);
      for (const carte of cartes) {
        expect(carte.querySelector('.carte__nom')?.textContent).not.toBe('');
        expect(carte.querySelector('.carte__prix')?.textContent).toMatch(/€/);
        expect(carte.querySelector('img')?.getAttribute('src')).toMatch(/^images\/produits\//);
      }
    });

    it('ne montre jamais un produit non publié', async () => {
      const page = await afficher('/boutique?category=thes');

      expect(noms(page)).not.toContain('Oolong de printemps');
    });

    it('fait de chaque carte un lien vers sa fiche, qui emporte les filtres', async () => {
      const page = await afficher('/boutique?category=thes&caffeine=HIGH');

      const lien = page.querySelector('app-ui-product-card a');
      expect(lien?.getAttribute('href')).toBe(
        '/boutique/matcha-ceremonie?category=thes&caffeine=HIGH',
      );
    });

    it('fait de même dans la vue par univers, avec le filtre de l’univers', async () => {
      const page = await afficher('/boutique');

      const lien = page.querySelector('app-universe-section app-ui-product-card a');
      expect(lien?.getAttribute('href')).toContain('/boutique/');
      expect(lien?.getAttribute('href')).toContain('category=thes');
    });

    it('propose un « Voir tout » par univers, qui pose le filtre de catégorie', async () => {
      const page = await afficher('/boutique');

      const lien = page.querySelector('app-universe-section a');
      expect(lien?.textContent).toContain('Voir tout');
      expect(lien?.getAttribute('href')).toContain('category=');
    });
  });

  // Critère 3 d'US-001.
  describe('parcours par lots', () => {
    it('ajoute le lot suivant sans doublon ni saut', async () => {
      const page = await afficher('/boutique?inStock=true');

      const premierLot = noms(page);
      expect(premierLot).toHaveLength(8);
      expect(textes(page, '.voir-plus')[0]).toContain('Voir plus');

      page.querySelector<HTMLButtonElement>('.voir-plus button')?.click();
      await stabiliser();

      const tout = noms(ecran());
      expect(tout.slice(0, premierLot.length)).toEqual(premierLot);
      expect(new Set(tout).size).toBe(tout.length);
      // Plus rien à charger : le bouton disparaît.
      expect(ecran().querySelector('.voir-plus')).toBeNull();
    });
  });

  describe('combiner deux filtres puis en retirer un', () => {
    it('cumule les critères, puis ne retire que celui qu’on désigne', async () => {
      const page = await afficher('/boutique?category=thes&caffeine=HIGH');

      expect(noms(page)).toEqual(['Matcha cérémonie']);
      expect(textes(page, '.critere')).toEqual(['Thés ×', 'Corsé ×']);

      page.querySelector<HTMLButtonElement>('[aria-label="Retirer le filtre Thés"]')?.click();
      await stabiliser();

      expect(router.url).toBe('/boutique?caffeine=HIGH');
      expect(textes(ecran(), '.critere')).toEqual(['Corsé ×']);
      expect(noms(ecran()).length).toBeGreaterThan(1);
    });
  });

  // Critère 4 d'US-001 : deux échecs, deux messages distincts.
  describe('catalogue vide', () => {
    it('explique qu’aucun produit ne correspond, sans parler d’erreur', async () => {
      const page = await afficher('/boutique?category=cbd&caffeine=HIGH');

      expect(noms(page)).toEqual([]);
      expect(textes(page, '.bloc__titre')).toEqual(['Rien ne correspond.']);
      expect(page.querySelector('[role="alert"]')).toBeNull();
      // Les critères restent posés : on doit pouvoir n'en retirer qu'un.
      expect(textes(page, '.critere')).toEqual(['CBD ×', 'Corsé ×']);
    });

    it('revient au catalogue complet en effaçant les filtres', async () => {
      const page = await afficher('/boutique?category=cbd&caffeine=HIGH');

      page.querySelector<HTMLButtonElement>('.bloc button')?.click();
      await stabiliser();

      expect(router.url).toBe('/boutique');
      expect(textes(ecran(), 'app-universe-section .entete__titre').length).toBeGreaterThan(1);
    });
  });

  describe('échec de chargement', () => {
    beforeEach(() => {
      TestBed.resetTestingModule();
      configurer(ApiMuette);
    });

    it('annonce l’échec et propose de réessayer, sans parler de filtres', async () => {
      const page = await afficher('/boutique');

      const alerte = page.querySelector('[role="alert"]');
      expect(alerte).not.toBeNull();
      expect(textes(page, '.bloc__titre')).toEqual(['Le catalogue n’a pas pu être chargé.']);
      expect(alerte?.textContent).toContain('Réessayer');
      // Message distinct de celui d'un catalogue vide (critère 4).
      expect(alerte?.textContent).not.toContain('Rien ne correspond');
    });
  });

  describe('valeur de filtre non autorisée', () => {
    it('nomme les champs refusés et n’affiche aucun produit', async () => {
      const page = await afficher('/boutique?type=TISANE&sort=prix');

      const alerte = page.querySelector('[role="alert"]');
      expect(alerte?.textContent).toContain('ne sont pas valides');
      expect(textes(page, '.bloc__champs li')).toEqual(['sort', 'type']);
      expect(noms(page)).toEqual([]);
    });

    it('affiche quand même le critère refusé, pour pouvoir le retirer', async () => {
      const page = await afficher('/boutique?category=thes&type=TISANE');

      expect(textes(page, '.critere')).toEqual(['Thés ×', 'TISANE ×']);

      page.querySelector<HTMLButtonElement>('[aria-label="Retirer le filtre TISANE"]')?.click();
      await stabiliser();

      expect(router.url).toBe('/boutique?category=thes');
      expect(ecran().querySelector('[role="alert"]')).toBeNull();
    });
  });

  describe('réinitialisation', () => {
    it('efface tous les critères d’un coup, tri compris', async () => {
      const page = await afficher('/boutique?category=thes&caffeine=HIGH&sort=price_desc');

      page.querySelector<HTMLButtonElement>('.tout-effacer')?.click();
      await stabiliser();

      expect(router.url).toBe('/boutique');
      expect(textes(ecran(), '.critere')).toEqual([]);
    });

    it('ne propose rien à effacer quand aucun critère n’est posé', async () => {
      const page = await afficher('/boutique');

      expect(page.querySelector('.tout-effacer')).toBeNull();
    });
  });
});

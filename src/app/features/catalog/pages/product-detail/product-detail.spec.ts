import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Observable, throwError } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';

import type { CatalogPage, CatalogProduct, Category } from '../../../../core/api/api.types';
import { ProductsMockService } from '../../../../core/api/mocks/products.mock.service';
import { ProductsService } from '../../../../core/api/products.service';
import { catalogRoutes } from '../../catalog.routes';

/** API injoignable : la requête échoue sans réponse du serveur. */
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

describe('ProductDetail', () => {
  let harness: RouterTestingHarness;

  const configurer = (service: typeof ProductsService): void => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'boutique', children: catalogRoutes }], withComponentInputBinding()),
        { provide: ProductsService, useClass: service },
      ],
    });
  };

  beforeEach(() => configurer(ProductsMockService));

  const afficher = async (url: string): Promise<HTMLElement> => {
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    // Les réponses simulées sont temporisées : on laisse passer la latence.
    await new Promise((resoudre) => setTimeout(resoudre, 500));
    await harness.fixture.whenStable();
    harness.detectChanges();
    return harness.routeNativeElement as HTMLElement;
  };

  const texte = (racine: HTMLElement, selecteur: string): string =>
    (racine.querySelector(selecteur)?.textContent ?? '').replace(/\s+/g, ' ').trim();

  it('affiche le produit demandé', async () => {
    const page = await afficher('/boutique/matcha-ceremonie');

    expect(texte(page, 'h1')).toBe('Matcha cérémonie');
    expect(texte(page, '.produit__prix')).toContain('24');
    expect(page.querySelector('img')?.getAttribute('src')).toBe(
      'images/produits/matcha-ceremonie.jpg',
    );
  });

  it('nomme l’onglet d’après le produit', async () => {
    await afficher('/boutique/matcha-ceremonie');

    expect(TestBed.inject(Title).getTitle()).toBe('Matcha cérémonie — Brume');
  });

  it('annonce la disponibilité, y compris une rupture', async () => {
    const page = await afficher('/boutique/kenya-aa');

    expect(texte(page, '.reperes')).toContain('Épuisé pour le moment');
  });

  // Critère 2 d'US-001 : ouvrir la fiche sans perdre le contexte.
  describe('contexte de navigation', () => {
    it('rend au lien de retour les filtres d’où vient le visiteur', async () => {
      const page = await afficher('/boutique/matcha-ceremonie?category=thes&caffeine=HIGH');

      const retour = page.querySelector('.fil a');
      expect(retour?.getAttribute('href')).toBe('/boutique?category=thes&caffeine=HIGH');
      expect(retour?.textContent).toContain('Retour aux résultats');
    });

    it('renvoie au catalogue entier quand on arrive sans filtre', async () => {
      const page = await afficher('/boutique/matcha-ceremonie');

      const retour = page.querySelector('.fil a');
      expect(retour?.getAttribute('href')).toBe('/boutique');
      expect(retour?.textContent).toContain('Toute la boutique');
    });
  });

  describe('produit absent', () => {
    it('traite un produit non publié comme un slug inconnu', async () => {
      const page = await afficher('/boutique/oolong-de-printemps');

      expect(texte(page, '.bloc__titre')).toBe('Ce produit n’existe pas.');
      // Pas une panne : on ne propose pas de réessayer.
      expect(page.querySelector('[role="alert"]')).toBeNull();
      expect(page.textContent).not.toContain('Réessayer');
    });

    it('traite un slug inconnu de la même façon', async () => {
      const page = await afficher('/boutique/the-qui-nexiste-pas');

      expect(texte(page, '.bloc__titre')).toBe('Ce produit n’existe pas.');
    });
  });

  describe('échec de chargement', () => {
    beforeEach(() => {
      TestBed.resetTestingModule();
      configurer(ApiMuette);
    });

    it('propose de réessayer, avec un message distinct de l’introuvable', async () => {
      const page = await afficher('/boutique/matcha-ceremonie');

      expect(texte(page, '.bloc__titre')).toBe('Ce produit n’a pas pu être chargé.');
      expect(page.querySelector('[role="alert"]')).not.toBeNull();
      expect(page.textContent).toContain('Réessayer');
    });
  });
});

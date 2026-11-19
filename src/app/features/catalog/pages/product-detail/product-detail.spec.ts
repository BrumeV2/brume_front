import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Observable, throwError } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';

import type { CatalogPage, CatalogProductDetail, Category } from '../../../../core/api/api.types';
import { ProductsMockService } from '../../../../core/api/mocks/products.mock.service';
import { UsersMockService } from '../../../../core/api/mocks/users.mock.service';
import { ProductsService } from '../../../../core/api/products.service';
import { UsersService } from '../../../../core/api/users.service';
import { CartStore } from '../../../../core/state/cart.store';
import { provideCartForTests } from '../../../../core/state/cart.testing';
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
  override getBySlug(): Observable<CatalogProductDetail> {
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
        { provide: UsersService, useClass: UsersMockService },
        provideCartForTests(),
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

  // US-021 : ajout au panier depuis la fiche.
  describe('ajout au panier', () => {
    const cliquer = async (racine: HTMLElement, selecteur: string): Promise<void> => {
      racine.querySelector<HTMLElement>(selecteur)?.click();
      harness.detectChanges();
      // L'ajout passe par l'API simulée, temporisée elle aussi : `/users/me`
      // (aucun menu n'a démarré la session dans ce test), puis `/cart/items`.
      await new Promise((resoudre) => setTimeout(resoudre, 1000));
      await harness.fixture.whenStable();
      harness.detectChanges();
    };

    const formats = (racine: HTMLElement): string[] =>
      [...racine.querySelectorAll('.format__libelle')].map(
        (format) => format.textContent?.trim() ?? '',
      );

    it('propose les formats du produit, le premier disponible choisi', async () => {
      const page = await afficher('/boutique/matcha-ceremonie');

      expect(formats(page)).toEqual(['Boîte 50 g', 'Boîte 100 g', 'Recharge 100 g']);
      expect(texte(page, '.format.est-choisi .format__libelle')).toBe('Boîte 50 g');
      expect(texte(page, '.ajout__bouton')).toContain('Ajouter au panier · 24');
    });

    it('suit le format choisi dans le prix et le bouton', async () => {
      const page = await afficher('/boutique/matcha-ceremonie');

      const options = page.querySelectorAll<HTMLInputElement>('.format input');
      options[1]?.click();
      harness.detectChanges();

      expect(texte(page, '.produit__prix')).toContain('42');
      expect(texte(page, '.ajout__bouton')).toContain('Ajouter au panier · 42');
    });

    it('confirme la ligne créée, avec la quantité choisie', async () => {
      const page = await afficher('/boutique/matcha-ceremonie');

      page.querySelector<HTMLButtonElement>('[aria-label="Ajouter un exemplaire"]')?.click();
      harness.detectChanges();
      await cliquer(page, '.ajout__bouton button');

      const confirmation = texte(page, '.confirmation');
      expect(confirmation).toContain('Ajouté à ton panier : 2 × Matcha cérémonie, Boîte 50 g.');
      expect(confirmation).toContain('Ce format dans ton panier : 2 · 48');
      expect(page.querySelector('.confirmation')?.getAttribute('role')).toBe('status');
      expect(TestBed.inject(CartStore).itemsCount()).toBe(2);
    });

    it('suit le panier quand la ligne est modifiée puis retirée depuis le tiroir', async () => {
      const page = await afficher('/boutique/matcha-ceremonie');
      await cliquer(page, '.ajout__bouton button');
      const panier = TestBed.inject(CartStore);
      const variante = panier.lines()[0]?.variantId ?? '';

      await panier.setQuantity(variante, 3);
      harness.detectChanges();
      expect(texte(page, '.confirmation')).toContain('Ce format dans ton panier : 3 · 72');

      await panier.remove(variante);
      harness.detectChanges();
      expect(texte(page, '.confirmation')).toContain('Ce format n’est plus dans ton panier.');
    });

    it('restitue le refus d’une quantité supérieure au stock', async () => {
      const page = await afficher('/boutique/matcha-ceremonie');

      // Recharge 100 g : 3 en stock dans le catalogue simulé.
      page.querySelectorAll<HTMLInputElement>('.format input')[2]?.click();
      harness.detectChanges();
      const plus = page.querySelector<HTMLButtonElement>('[aria-label="Ajouter un exemplaire"]');
      for (let i = 0; i < 3; i++) {
        plus?.click();
        harness.detectChanges();
      }
      await cliquer(page, '.ajout__bouton button');

      expect(texte(page, '.refus')).toBe('Il ne reste que 3 exemplaires de ce format.');
      expect(page.querySelector('.refus')?.getAttribute('role')).toBe('alert');
      expect(page.querySelector('.confirmation')).toBeNull();
      expect(TestBed.inject(CartStore).itemsCount()).toBe(0);
    });

    it('ne propose pas d’ajouter un produit épuisé', async () => {
      const page = await afficher('/boutique/kenya-aa');

      const bouton = page.querySelector<HTMLButtonElement>('.ajout__bouton button');
      expect(bouton?.disabled).toBe(true);
      expect(texte(page, '.ajout__bouton')).toContain('Épuisé pour le moment');
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

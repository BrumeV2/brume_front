import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { ProductsMockService } from '../../../../core/api/mocks/products.mock.service';
import { ProductsService } from '../../../../core/api/products.service';
import { catalogRoutes } from '../../catalog.routes';

/**
 * L'écran est branché sur l'implémentation simulée, pas sur un double : ce qui
 * est vérifié ici, c'est l'enchaînement complet URL → requête → affichage,
 * avec la même validation que celle du back.
 */
describe('ProductList', () => {
  let harness: RouterTestingHarness;
  let router: Router;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'boutique', children: catalogRoutes }]),
        { provide: ProductsService, useClass: ProductsMockService },
      ],
    });
    harness = await RouterTestingHarness.create();
    router = TestBed.inject(Router);
  });

  /** Rend l'écran à l'URL donnée et attend la fin des requêtes simulées. */
  const afficher = async (url: string): Promise<HTMLElement> => {
    await harness.navigateByUrl(url);
    await stabiliser();
    return harness.routeNativeElement as HTMLElement;
  };

  const stabiliser = async (): Promise<void> => {
    // Les réponses simulées sont temporisées : on laisse passer la latence.
    await new Promise((resoudre) => setTimeout(resoudre, 500));
    await harness.fixture.whenStable();
    harness.detectChanges();
  };

  // `textContent` et non `innerText` : jsdom ne calcule pas de rendu, donc
  // `innerText` y vaut toujours `undefined`.
  const textes = (racine: HTMLElement, selecteur: string): string[] =>
    [...racine.querySelectorAll(selecteur)].map((element) =>
      (element.textContent ?? '').replace(/\s+/g, ' ').trim(),
    );

  it('affiche le catalogue complet sans filtre', async () => {
    const ecran = await afficher('/boutique');

    expect(textes(ecran, '.nom').length).toBeGreaterThan(0);
    expect(textes(ecran, '.critere')).toEqual([]);
  });

  it('applique les filtres portés par l’URL', async () => {
    const ecran = await afficher('/boutique?type=COFFEE');

    expect(textes(ecran, '.nom')).toEqual(['Éthiopie Moka Sidamo']);
    expect(textes(ecran, '.critere')).toEqual(['Café ×']);
  });

  describe('combiner deux filtres puis en retirer un', () => {
    it('cumule les critères, puis ne retire que celui qu’on désigne', async () => {
      const ecran = await afficher('/boutique?category=thes&caffeine=HIGH');

      expect(textes(ecran, '.nom')).toEqual(['Earl Grey Impérial']);
      expect(textes(ecran, '.critere')).toEqual(['Thés ×', 'Corsé ×']);

      const retirerCategorie = ecran.querySelector<HTMLButtonElement>(
        '[aria-label="Retirer le filtre Thés"]',
      );
      retirerCategorie?.click();
      await stabiliser();

      expect(router.url).toBe('/boutique?caffeine=HIGH');
      expect(textes(harness.routeNativeElement as HTMLElement, '.critere')).toEqual(['Corsé ×']);
      expect(textes(harness.routeNativeElement as HTMLElement, '.nom')).toEqual([
        'Earl Grey Impérial',
        'Éthiopie Moka Sidamo',
      ]);
    });
  });

  describe('combinaison vide', () => {
    it('affiche l’état sans résultat, pas une erreur', async () => {
      const ecran = await afficher('/boutique?category=accessoires&caffeine=HIGH');

      expect(textes(ecran, '.nom')).toEqual([]);
      expect(textes(ecran, '.titre-vide')).toEqual(['Rien ne correspond.']);
      expect(ecran.querySelector('[role="alert"]')).toBeNull();
      // Les critères restent affichés : on doit pouvoir n'en retirer qu'un.
      expect(textes(ecran, '.critere')).toEqual(['Accessoires ×', 'Corsé ×']);
    });

    it('revient au catalogue complet en effaçant les filtres', async () => {
      const ecran = await afficher('/boutique?category=accessoires&caffeine=HIGH');

      ecran.querySelector<HTMLButtonElement>('.etat-vide .bouton')?.click();
      await stabiliser();

      expect(router.url).toBe('/boutique');
      expect(textes(harness.routeNativeElement as HTMLElement, '.nom').length).toBeGreaterThan(1);
    });
  });

  describe('valeur de filtre non autorisée', () => {
    it('affiche l’erreur de l’API et n’affiche aucun produit', async () => {
      const ecran = await afficher('/boutique?type=TISANE');

      const alerte = ecran.querySelector('[role="alert"]');
      expect(alerte).not.toBeNull();
      expect(alerte?.textContent).toContain('ne sont pas valides');
      // Le champ fautif est nommé, pour que l'erreur soit actionnable.
      expect(textes(ecran, '.champs li')).toEqual(['type']);
      expect(textes(ecran, '.nom')).toEqual([]);
    });

    it('affiche quand même le critère refusé, pour pouvoir le retirer', async () => {
      const ecran = await afficher('/boutique?category=thes&type=TISANE');

      expect(textes(ecran, '.critere')).toEqual(['Thés ×', 'TISANE ×']);

      ecran.querySelector<HTMLButtonElement>('[aria-label="Retirer le filtre TISANE"]')?.click();
      await stabiliser();

      expect(router.url).toBe('/boutique?category=thes');
      expect(harness.routeNativeElement?.querySelector('[role="alert"]')).toBeNull();
    });
  });

  describe('réinitialisation', () => {
    it('efface tous les critères d’un coup, y compris le tri', async () => {
      const ecran = await afficher('/boutique?category=thes&caffeine=HIGH&sort=price_desc');

      ecran.querySelector<HTMLButtonElement>('.tout-effacer')?.click();
      await stabiliser();

      expect(router.url).toBe('/boutique');
      expect(textes(harness.routeNativeElement as HTMLElement, '.critere')).toEqual([]);
    });

    it('ne propose rien à effacer quand aucun critère n’est posé', async () => {
      const ecran = await afficher('/boutique');

      expect(ecran.querySelector('.tout-effacer')).toBeNull();
    });
  });

  it('repart de la première page quand un filtre change', async () => {
    const ecran = await afficher('/boutique?page=2');

    ecran.querySelector<HTMLButtonElement>('[aria-pressed]')?.click();
    await stabiliser();

    expect(router.url).toBe('/boutique?inStock=true');
  });
});

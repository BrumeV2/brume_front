import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Observable, Subject, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  PRODUCTS_MOCK_OPTIONS,
  ProductsMockService,
} from '../../../../core/api/mocks/products.mock.service';
import type {
  CatalogPage,
  CatalogProductDetail,
  Category,
  FormatAvailability,
} from '../../../../core/api/api.types';
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
  override getBySlug(): Observable<CatalogProductDetail> {
    return this.panne();
  }
  override checkAvailability(): Observable<FormatAvailability> {
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
        { provide: PRODUCTS_MOCK_OPTIONS, useValue: { delayMs: 0, failFirstSearches: 0 } },
      ],
    });
  };

  beforeEach(() => configurer(ProductsMockService));

  const stabiliser = async (): Promise<void> => {
    // Laisse émettre les réponses simulées à latence nulle.
    await new Promise((resoudre) => setTimeout(resoudre, 10));
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
  describe('rechercher un produit (US-014)', () => {
    const saisir = (texte: string): void => {
      const champ = ecran().querySelector<HTMLInputElement>('input[type="search"]')!;
      champ.value = texte;
      champ.dispatchEvent(new Event('input', { bubbles: true }));
    };
    const soumettre = (): void => {
      ecran()
        .querySelector('form[role="search"]')!
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    };

    it('présente la recherche accessible à côté des filtres, sans bouton de recherche', async () => {
      const page = await afficher('/boutique');
      expect(page.querySelector('input[type="search"]')?.getAttribute('aria-label')).toBe(
        'Rechercher un produit',
      );
      expect(page.querySelector('.bandeau form')).toBeNull();
      expect(
        page.querySelector('app-catalog-filters .pastilles form[role="search"]'),
      ).not.toBeNull();
      expect(page.querySelector('form[role="search"] button')).toBeNull();
      expect(page.querySelector('label[for="recherche-produit"]')).toBeNull();
      expect(page.textContent).not.toContain('Par nom, avec ou sans accents.');
      expect(page.querySelector<HTMLInputElement>('input[type="search"]')?.value).toBe('');
      expect(page.querySelectorAll('app-universe-section').length).toBeGreaterThan(0);
    });

    it('recherche pendant la saisie après une courte pause, sans soumission', async () => {
      await afficher('/boutique');
      const service = TestBed.inject(ProductsService);
      const appels = vi.spyOn(service, 'list');
      saisir('m');
      saisir('mai');
      saisir('maison');
      await stabiliser();
      expect(appels).not.toHaveBeenCalled();
      await vi.waitFor(() => {
        harness.detectChanges();
        expect(noms(ecran())).toEqual(['Chaï maison', 'Espresso maison']);
      });
      expect(router.url).toBe('/boutique?q=maison');
      expect(appels).toHaveBeenCalledTimes(1);
    });

    it('efface dynamiquement la recherche tout en conservant la catégorie', async () => {
      await afficher('/boutique?q=maison&category=thes');
      saisir('');
      await vi.waitFor(() => expect(router.url).toBe('/boutique?category=thes'));
      await stabiliser();
      expect(noms(ecran()).length).toBeGreaterThan(1);
    });

    it('annule une saisie en attente quand les filtres sont réinitialisés', async () => {
      await afficher('/boutique?q=maison');
      saisir('matcha');
      ecran().querySelector<HTMLButtonElement>('.tout-effacer')!.click();
      await new Promise((resolve) => setTimeout(resolve, 300));
      await stabiliser();
      expect(router.url).toBe('/boutique');
      expect(ecran().querySelector<HTMLInputElement>('input')?.value).toBe('');
    });

    it('soumet la saisie, restitue la requête et affiche plusieurs produits', async () => {
      await afficher('/boutique');
      saisir('  MAISON  ');
      soumettre();
      await stabiliser();
      expect(router.url).toBe('/boutique?q=MAISON');
      expect(ecran().querySelector<HTMLInputElement>('input')?.value).toBe('MAISON');
      expect(ecran().textContent).toContain('Recherche : « MAISON »');
      expect(noms(ecran())).toEqual(['Chaï maison', 'Espresso maison']);
      expect(textes(ecran(), '.carte__prix').every((prix) => prix.includes('€'))).toBe(true);
    });

    it('normalise aussi la saisie quand la requête soumise ne change pas', async () => {
      await afficher('/boutique?q=maison');
      saisir('  maison  ');
      soumettre();
      await stabiliser();
      expect(router.url).toBe('/boutique?q=maison');
      expect(ecran().querySelector<HTMLInputElement>('input')?.value).toBe('maison');
      expect(noms(ecran())).toEqual(['Chaï maison', 'Espresso maison']);
    });

    it('restaure une recherche par URL puis suit les navigations', async () => {
      await afficher('/boutique?q=deCAFE');
      expect(noms(ecran())).toEqual(['Décaféiné Pérou']);
      await harness.navigateByUrl('/boutique?q=chai');
      await stabiliser();
      expect(ecran().querySelector<HTMLInputElement>('input')?.value).toBe('chai');
      expect(noms(ecran())).toEqual(['Chaï maison']);
    });

    it('retire une recherche vide en conservant les autres filtres', async () => {
      await afficher('/boutique?q=maison&category=thes');
      saisir('   ');
      soumettre();
      await stabiliser();
      expect(router.url).toBe('/boutique?category=thes');
      expect(noms(ecran()).length).toBeGreaterThan(1);
    });

    it('annonce une recherche sans résultat en conservant la saisie', async () => {
      await afficher('/boutique?q=introuvable');
      expect(noms(ecran())).toEqual([]);
      expect(ecran().querySelector('[role="status"]')?.textContent).toContain('Rien ne correspond');
      expect(ecran().querySelector<HTMLInputElement>('input')?.value).toBe('introuvable');
    });

    it('signale une requête trop longue et permet de la corriger', async () => {
      await afficher('/boutique');
      saisir('x'.repeat(101));
      soumettre();
      await stabiliser();
      expect(ecran().querySelector('input')?.getAttribute('aria-invalid')).toBe('true');
      expect(ecran().querySelector('[role="alert"]')?.textContent).toContain('q');
      expect(noms(ecran())).toEqual([]);
      saisir('matcha');
      soumettre();
      await stabiliser();
      expect(noms(ecran())).toEqual(['Matcha cérémonie']);
      expect(ecran().querySelector('[role="alert"]')).toBeNull();
    });

    it('réussit après une erreur simulée et un clic sur Réessayer', async () => {
      TestBed.overrideProvider(PRODUCTS_MOCK_OPTIONS, {
        useValue: { delayMs: 0, failFirstSearches: 1 },
      });
      await afficher('/boutique?q=maison');
      expect(ecran().querySelector('[role="alert"]')?.textContent).toContain(
        'La recherche a échoué',
      );
      expect(noms(ecran())).toEqual([]);
      ecran().querySelector<HTMLButtonElement>('[role="alert"] button')!.click();
      await stabiliser();
      expect(noms(ecran())).toEqual(['Chaï maison', 'Espresso maison']);
      expect(ecran().querySelector('[role="alert"]')).toBeNull();
      expect(router.url).toBe('/boutique?q=maison');
    });

    it('affiche le chargement et ignore une ancienne réponse après une nouvelle recherche', async () => {
      await afficher('/boutique?q=maison');
      const service = TestBed.inject(ProductsService);
      const reponse = await new Promise<CatalogPage>((resolve) =>
        service.list({ q: 'matcha' }).subscribe(resolve),
      );
      const ancienne = new Subject<CatalogPage>();
      const recente = new Subject<CatalogPage>();
      vi.spyOn(service, 'list').mockImplementation((query) =>
        query.q === 'chai' ? ancienne : recente,
      );
      await harness.navigateByUrl('/boutique?q=chai');
      harness.detectChanges();
      expect(ecran().querySelector('[aria-busy="true"]')).not.toBeNull();
      expect(ecran().querySelector('[role="status"]')?.textContent).toContain('Chargement');
      expect(ecran().querySelectorAll('.fantome')).toHaveLength(8);
      expect(ecran().querySelector('.grille--chargement')?.getAttribute('aria-hidden')).toBe(
        'true',
      );
      expect(ecran().querySelector('.grille--chargement a, .grille--chargement button')).toBeNull();
      expect(noms(ecran())).toEqual([]);
      await harness.navigateByUrl('/boutique?q=matcha');
      recente.next(reponse);
      harness.detectChanges();
      ancienne.next({ data: [], meta: { page: 1, limit: 8, total: 0, totalPages: 1 } });
      ancienne.complete();
      harness.detectChanges();
      expect(noms(ecran())).toEqual(['Matcha cérémonie']);
      expect(ecran().querySelector('[aria-busy="true"]')).toBeNull();
      expect(ecran().querySelector('.grille--chargement')).toBeNull();
      recente.complete();
    });

    it('annule aussi un lot en cours quand la recherche change', async () => {
      await afficher('/boutique?inStock=true');
      const service = TestBed.inject(ProductsService);
      const original = service.list.bind(service);
      const lot = new Subject<CatalogPage>();
      vi.spyOn(service, 'list').mockImplementation((query) =>
        query.page === 2 ? lot : original(query),
      );
      ecran().querySelector<HTMLButtonElement>('.voir-plus button')!.click();
      await harness.navigateByUrl('/boutique?q=matcha');
      await stabiliser();
      lot.next({ data: [], meta: { page: 2, limit: 8, total: 99, totalPages: 13 } });
      lot.complete();
      harness.detectChanges();
      expect(noms(ecran())).toEqual(['Matcha cérémonie']);
      expect(ecran().querySelector('.voir-plus')).toBeNull();
    });
  });
});

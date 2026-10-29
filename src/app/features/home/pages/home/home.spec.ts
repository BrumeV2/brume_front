import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { HomeService, type HomeShowcase } from '../../../../core/api/home.service';
import { mockShowcases } from '../../../../core/api/mocks/fixtures/home.fixture';
import { SideStore } from '../../../../core/state/side.store';
import { InMemoryStorage, SESSION_STORAGE } from '../../../../core/storage/browser-storage';

import { Home } from './home';

/** Vitrine instantanée : pas de latence simulée dans les tests de la page. */
class VitrineImmediate extends HomeService {
  echec = false;

  override getShowcase(side: 'the' | 'cafe' | null): Observable<HomeShowcase> {
    if (this.echec) return throwError(() => new Error('réseau'));
    return of(mockShowcases[side ?? 'neutre']);
  }
}

describe('Home', () => {
  let fixture: ComponentFixture<Home>;
  let store: SideStore;
  let vitrine: VitrineImmediate;

  beforeAll(() => {
    const prototype = HTMLDialogElement.prototype;
    prototype.showModal ??= function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    };
    globalThis.IntersectionObserver ??= class {
      observe(): void {}
      disconnect(): void {}
    } as unknown as typeof IntersectionObserver;
  });

  const element = () => fixture.nativeElement as HTMLElement;

  async function rendre(): Promise<void> {
    fixture = TestBed.createComponent(Home);
    fixture.detectChanges();
    // `toObservable` n'émet qu'au passage suivant de la détection de changements.
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(() => {
    vitrine = new VitrineImmediate();
    TestBed.configureTestingModule({
      imports: [Home],
      providers: [
        provideRouter([]),
        { provide: HomeService, useValue: vitrine },
        { provide: SESSION_STORAGE, useValue: new InMemoryStorage() },
      ],
    });
    store = TestBed.inject(SideStore);
  });

  it('présente l’offre et propose d’ouvrir le catalogue', async () => {
    await rendre();

    expect(element().querySelector('h1')?.textContent).toContain('Infuser,');
    expect(element().textContent).toContain('Les préférés de la maison');
    expect(element().querySelectorAll('app-ui-product-card')).toHaveLength(4);
    expect(element().querySelector('a[href^="/boutique"]')).not.toBeNull();
  });

  it('ne fait aucun lien vers une fonction pas encore livrée', async () => {
    await rendre();

    const liens = [...element().querySelectorAll('a')].map((a) => a.getAttribute('href') ?? '');
    expect(liens.length).toBeGreaterThan(0);
    for (const lien of liens) {
      expect(lien).toMatch(/^\/boutique(\?|$)/);
    }
  });

  it('montre l’intro à la première visite de la session seulement', async () => {
    await rendre();
    expect(element().querySelector('app-home-intro')).not.toBeNull();

    store.markIntroSeen();
    fixture.detectChanges();
    expect(element().querySelector('app-home-intro')).toBeNull();
  });

  it('côté café : univers café en premier et section café remontée sous les univers', async () => {
    store.markIntroSeen();
    store.choose('cafe');
    await rendre();

    const univers = [...element().querySelectorAll('.univers__nom')].map((n) => n.textContent);
    expect(univers[0]).toBe('Le café');

    const sections = [...element().querySelectorAll('h2')].map((h) => h.id);
    expect(sections.indexOf('titre-cafe')).toBeLessThan(sections.indexOf('titre-maniere'));
    expect(element().querySelector('h1')?.closest('section')?.textContent).toContain('Côté café');
  });

  it('dit quand la sélection n’a pas pu être chargée', async () => {
    vitrine.echec = true;
    await rendre();

    expect(element().querySelectorAll('[role="alert"]')).toHaveLength(2);
    expect(element().querySelector('app-ui-product-card')).toBeNull();
  });
});

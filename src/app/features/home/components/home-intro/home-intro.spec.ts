import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { SideStore } from '../../../../core/state/side.store';
import { InMemoryStorage, SESSION_STORAGE } from '../../../../core/storage/browser-storage';

import { HomeIntro } from './home-intro';

describe('HomeIntro', () => {
  let fixture: ComponentFixture<HomeIntro>;
  let store: SideStore;

  beforeAll(() => {
    // jsdom ne sait pas ouvrir un <dialog> modal : on reproduit l'essentiel.
    const prototype = HTMLDialogElement.prototype;
    prototype.showModal ??= function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    };
  });

  const element = () => fixture.nativeElement as HTMLElement;
  const attendre = () => new Promise((resolve) => setTimeout(resolve));

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [{ provide: SESSION_STORAGE, useValue: new InMemoryStorage() }],
    });
    store = TestBed.inject(SideStore);
    fixture = TestBed.createComponent(HomeIntro);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('s’ouvre en modale et propose les deux côtés et un moyen de passer', () => {
    expect(element().querySelector('dialog')?.open).toBe(true);
    const volets = [...element().querySelectorAll('[app-intro-panel]')];
    expect(volets.map((v) => v.getAttribute('data-cote'))).toEqual(['the', 'cafe']);
    expect(element().querySelector('.intro__passer')?.textContent).toContain("Passer l'intro");
  });

  it('« Passer l’intro » entre dans le site sans choisir de côté', async () => {
    element().querySelector<HTMLButtonElement>('.intro__passer')?.click();
    await attendre();

    expect(store.introSeen()).toBe(true);
    expect(store.side()).toBeNull();
  });

  it('Échap fait la même chose', async () => {
    element()
      .querySelector('dialog')
      ?.dispatchEvent(new Event('cancel', { cancelable: true }));
    await attendre();

    expect(store.introSeen()).toBe(true);
  });

  it('choisir un côté le met en avant dans toute la boutique', async () => {
    // Sans matchMedia (jsdom), les animations sont considérées comme réduites : entrée immédiate.
    element().querySelector<HTMLButtonElement>('[data-cote="cafe"]')?.click();
    await attendre();

    expect(store.side()).toBe('cafe');
    expect(store.introSeen()).toBe(true);
  });
});

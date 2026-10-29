import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { InMemoryStorage, SESSION_STORAGE } from '../storage/browser-storage';

import { SideStore } from './side.store';

describe('SideStore', () => {
  let storage: InMemoryStorage;

  function creer(): SideStore {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: SESSION_STORAGE, useValue: storage }],
    });
    return TestBed.inject(SideStore);
  }

  beforeEach(() => {
    storage = new InMemoryStorage();
  });

  it('part de la version neutre, intro pas encore vue', () => {
    const store = creer();

    expect(store.side()).toBeNull();
    expect(store.introSeen()).toBe(false);
  });

  it('re-cliquer sur le côté choisi revient à la version neutre', () => {
    const store = creer();

    store.toggle('cafe');
    expect(store.side()).toBe('cafe');
    store.toggle('the');
    expect(store.side()).toBe('the');
    store.toggle('the');
    expect(store.side()).toBeNull();
  });

  it('garde le choix et l’intro vue pour la session (rechargement de page)', () => {
    const premier = creer();
    premier.choose('cafe');
    premier.markIntroSeen();

    const apresRechargement = creer();
    expect(apresRechargement.side()).toBe('cafe');
    expect(apresRechargement.introSeen()).toBe(true);
  });

  it('ignore une valeur enregistrée inconnue', () => {
    storage.setItem('brume.cote', 'chocolat');

    expect(creer().side()).toBeNull();
  });
});

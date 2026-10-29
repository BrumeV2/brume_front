import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';

import { SideStore } from '../../core/state/side.store';
import { InMemoryStorage, SESSION_STORAGE } from '../../core/storage/browser-storage';

import { SideSwitch } from './side-switch';

describe('SideSwitch', () => {
  let fixture: ComponentFixture<SideSwitch>;
  let store: SideStore;

  const element = () => fixture.nativeElement as HTMLElement;
  const bouton = (libelle: string) =>
    [...element().querySelectorAll('button')].find(
      (b) => b.textContent?.trim() === libelle,
    ) as HTMLButtonElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SideSwitch],
      providers: [provideRouter([]), { provide: SESSION_STORAGE, useValue: new InMemoryStorage() }],
    });
    store = TestBed.inject(SideStore);
    fixture = TestBed.createComponent(SideSwitch);
    fixture.detectChanges();
  });

  it('indique le côté choisi et le confirme', () => {
    bouton('Café').click();
    fixture.detectChanges();

    expect(store.side()).toBe('cafe');
    expect(bouton('Café').getAttribute('aria-pressed')).toBe('true');
    expect(bouton('Thé').getAttribute('aria-pressed')).toBe('false');
    expect(element().querySelector('[role="status"]')?.textContent).toContain('Côté café');
  });

  it('re-cliquer revient à thé et café à égalité', () => {
    bouton('Thé').click();
    bouton('Thé').click();
    fixture.detectChanges();

    expect(store.side()).toBeNull();
    expect(element().querySelector('[role="status"]')?.textContent).toContain('à égalité');
  });
});

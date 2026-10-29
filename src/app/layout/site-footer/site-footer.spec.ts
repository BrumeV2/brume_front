import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';

import { SiteFooter } from './site-footer';

describe('SiteFooter', () => {
  function rendre(): HTMLElement {
    TestBed.configureTestingModule({ imports: [SiteFooter], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(SiteFooter);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('relie les univers au catalogue filtré', () => {
    const liens = [...rendre().querySelectorAll('a')].map((lien) => lien.getAttribute('href'));

    expect(liens).toEqual([
      '/boutique?category=thes',
      '/boutique?category=cafes',
      '/boutique?category=cbd',
    ]);
  });

  it('montre les fonctions à venir sans jamais en faire des liens', () => {
    const element = rendre();
    const aVenir = [...element.querySelectorAll('.pied__a-venir')].map((entree) =>
      entree.firstChild?.textContent?.trim(),
    );

    expect(aVenir).toEqual([
      'TEA-BOX',
      'Carte cadeau',
      'TeaOMatic',
      'La Bataille des Mélanges',
      "Calendrier de l'Avent",
      'Le journal',
      'Le quiz',
    ]);
    expect(element.querySelector('.pied__a-venir a')).toBeNull();
  });

  it('ne propose pas de formulaire de lettre tant qu’aucune API ne la reçoit', () => {
    const element = rendre();

    expect(element.querySelector('form, input')).toBeNull();
    expect(element.textContent).toContain('La lettre de Brume.');
  });
});

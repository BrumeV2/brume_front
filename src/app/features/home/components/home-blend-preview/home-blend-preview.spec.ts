import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { HomeBlendPreview } from './home-blend-preview';

describe('HomeBlendPreview', () => {
  let fixture: ComponentFixture<HomeBlendPreview>;

  const element = () => fixture.nativeElement as HTMLElement;
  const nom = () => element().querySelector('.apercu__nom')?.textContent?.trim();
  const ingredient = (libelle: string) =>
    [...element().querySelectorAll<HTMLButtonElement>('[aria-pressed]')].find((bouton) =>
      bouton.textContent?.includes(libelle),
    ) as HTMLButtonElement;

  beforeEach(() => {
    fixture = TestBed.createComponent(HomeBlendPreview);
    fixture.detectChanges();
  });

  it('compose le nom du mélange comme la maquette', () => {
    expect(nom()).toBe('Sencha · gingembre & citron');

    ingredient('Rose').click();
    fixture.detectChanges();
    expect(nom()).toBe('Sencha · gingembre, citron & rose');
  });

  it('limite à trois ingrédients', () => {
    ingredient('Rose').click();
    ingredient('Vanille').click();
    fixture.detectChanges();

    expect(ingredient('Vanille').getAttribute('aria-pressed')).toBe('false');
    expect(element().querySelectorAll('[aria-pressed="true"]')).toHaveLength(3);
  });

  it('change de catalogue côté café', () => {
    fixture.componentRef.setInput('side', 'cafe');
    fixture.detectChanges();

    expect(nom()).toBe('Café Brésil · cacao & noisette');
  });

  it('ne mène nulle part : le configurateur n’est pas livré', () => {
    expect(element().querySelector('a')).toBeNull();
    expect(element().textContent).toContain('bientôt');
  });
});

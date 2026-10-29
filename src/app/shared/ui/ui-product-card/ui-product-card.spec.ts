import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';

import { UiProductCard } from './ui-product-card';

describe('UiProductCard', () => {
  let fixture: ComponentFixture<UiProductCard>;

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UiProductCard],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(UiProductCard);
    fixture.componentRef.setInput('nom', 'Matcha cérémonie');
    fixture.componentRef.setInput('prixCents', 2400);
  });

  it('affiche le nom et le prix formaté depuis les centimes', () => {
    fixture.detectChanges();

    expect(element().querySelector('h3')?.textContent).toBe('Matcha cérémonie');
    expect(element().querySelector('.carte__prix')?.textContent?.replace(/\s/g, ' ')).toBe('24 €');
  });

  it('sans lien, reste un aperçu non cliquable', () => {
    fixture.detectChanges();

    expect(element().querySelector('a')).toBeNull();
    expect(element().querySelector('article')).not.toBeNull();
  });

  it('avec un lien, toute la carte mène à la fiche', () => {
    fixture.componentRef.setInput('lien', '/boutique/matcha-ceremonie');
    fixture.detectChanges();

    expect(element().querySelector('a')?.getAttribute('href')).toBe('/boutique/matcha-ceremonie');
  });

  it('n’affiche le badge, l’origine et les notes que s’ils sont fournis', () => {
    fixture.detectChanges();
    expect(element().querySelector('.carte__badge')).toBeNull();
    expect(element().querySelector('.carte__origine')).toBeNull();
    expect(element().querySelector('.carte__notes')).toBeNull();

    fixture.componentRef.setInput('badge', 'Préféré');
    fixture.componentRef.setInput('origine', 'Vert · Uji, Japon');
    fixture.componentRef.setInput('moment', 'Matin');
    fixture.detectChanges();
    expect(element().querySelector('.carte__badge')?.textContent).toBe('Préféré');
    expect(element().querySelector('.carte__origine')?.textContent).toBe('Vert · Uji, Japon');
    expect(element().querySelector('.carte__moment')?.textContent).toBe('Matin');
  });
});

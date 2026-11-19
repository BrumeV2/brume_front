import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { UiQuantity } from './ui-quantity';

describe('UiQuantity', () => {
  let fixture: ComponentFixture<UiQuantity>;

  const bouton = (libelle: string): HTMLButtonElement =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      `[aria-label="${libelle}"]`,
    ) as HTMLButtonElement;

  const valeur = (): string =>
    (fixture.nativeElement as HTMLElement).querySelector('output')?.textContent?.trim() ?? '';

  beforeEach(() => {
    fixture = TestBed.createComponent(UiQuantity);
    fixture.componentRef.setInput('max', 3);
    fixture.detectChanges();
  });

  it('part de 1 et ne descend pas en dessous', () => {
    expect(valeur()).toBe('1');
    expect(bouton('Retirer un exemplaire').disabled).toBe(true);
  });

  it('monte jusqu’au maximum, puis se bloque', () => {
    for (let i = 0; i < 5; i++) {
      bouton('Ajouter un exemplaire').click();
      fixture.detectChanges();
    }

    expect(valeur()).toBe('3');
    expect(fixture.componentInstance.valeur()).toBe(3);
    expect(bouton('Ajouter un exemplaire').disabled).toBe(true);
  });

  it('se bloque entièrement quand il est désactivé', () => {
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();

    expect(bouton('Ajouter un exemplaire').disabled).toBe(true);
    expect(bouton('Retirer un exemplaire').disabled).toBe(true);
  });

  it('nomme ce qu’il compte pour les lecteurs d’écran', () => {
    fixture.componentRef.setInput('objet', 'Matcha cérémonie, Boîte 50 g');
    fixture.detectChanges();

    const groupe = (fixture.nativeElement as HTMLElement).querySelector('[role="group"]');
    expect(groupe?.getAttribute('aria-label')).toBe('Quantité de Matcha cérémonie, Boîte 50 g');
  });
});

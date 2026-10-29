import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { UiStep } from './ui-step';

describe('UiStep', () => {
  it('annonce le numéro avec le titre, sans le lire deux fois', () => {
    const fixture = TestBed.createComponent(UiStep);
    fixture.componentRef.setInput('numero', '01');
    fixture.componentRef.setInput('titre', 'Choisis ta base');
    fixture.componentRef.setInput('texte', 'Un thé ou un café.');
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('h3')?.textContent?.trim()).toBe('Étape 01 : Choisis ta base');
    expect(element.querySelector('.etape__numero')?.getAttribute('aria-hidden')).toBe('true');
    expect(element.querySelector('img')).toBeNull();
  });
});

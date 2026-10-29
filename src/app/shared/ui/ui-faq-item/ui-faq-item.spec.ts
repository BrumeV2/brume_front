import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { UiFaqItem } from './ui-faq-item';

@Component({
  imports: [UiFaqItem],
  template: `<app-ui-faq-item question="Je peux arrêter quand je veux ?">
    Oui, en un clic depuis ton compte.
  </app-ui-faq-item>`,
})
class Hote {}

describe('UiFaqItem', () => {
  function rendre(): HTMLElement {
    const fixture = TestBed.createComponent(Hote);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('affiche la question repliée, avec la réponse projetée', () => {
    const element = rendre();
    const details = element.querySelector('details');

    expect(element.querySelector('summary')?.textContent).toContain(
      'Je peux arrêter quand je veux ?',
    );
    expect(details?.open).toBe(false);
    expect(element.querySelector('.faq__reponse')?.textContent).toContain(
      'Oui, en un clic depuis ton compte.',
    );
  });

  it('se déplie quand on active la question', () => {
    const element = rendre();

    element.querySelector('summary')?.click();

    expect(element.querySelector('details')?.open).toBe(true);
  });
});

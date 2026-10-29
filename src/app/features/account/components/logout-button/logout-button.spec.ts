import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';

import { AuthService } from '../../../../core/auth/auth.service';

import { LogoutButton } from './logout-button';

@Component({ template: '' })
class PageVide {}

/** Faux service : chaque déconnexion renvoie une promesse que le test résout ou rejette. */
class AuthDouble {
  appels = 0;
  private resoudre: () => void = () => undefined;
  private rejeter: (raison: unknown) => void = () => undefined;

  logout(): Promise<void> {
    this.appels++;
    return new Promise<void>((resolve, reject) => {
      this.resoudre = resolve;
      this.rejeter = reject;
    });
  }

  confirmer(): void {
    this.resoudre();
  }

  echouer(): void {
    this.rejeter(new Error('réseau coupé'));
  }
}

describe('LogoutButton', () => {
  let fixture: ComponentFixture<LogoutButton>;
  let auth: AuthDouble;
  let router: Router;

  function bouton(): HTMLButtonElement {
    const element = (fixture.nativeElement as HTMLElement).querySelector('button');
    if (element === null) throw new Error('bouton introuvable');
    return element;
  }

  function alerte(): HTMLElement | null {
    return (fixture.nativeElement as HTMLElement).querySelector('[role="alert"]');
  }

  /**
   * Laisse le composant finir sa réaction. La navigation ne démarre qu'après la
   * résolution de la promesse de déconnexion : on rend d'abord la main une fois,
   * sinon `whenStable()` peut répondre avant qu'elle ait commencé.
   */
  async function stabiliser(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve));
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    auth = new AuthDouble();
    await TestBed.configureTestingModule({
      imports: [LogoutButton],
      providers: [
        provideRouter([
          { path: 'compte', component: PageVide },
          { path: 'connexion', component: PageVide },
        ]),
        { provide: AuthService, useValue: auth },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    await router.navigateByUrl('/compte');
    fixture = TestBed.createComponent(LogoutButton);
    fixture.detectChanges();
  });

  it('renvoie vers la page de connexion une fois la déconnexion confirmée', async () => {
    bouton().click();
    auth.confirmer();
    await stabiliser();

    expect(auth.appels).toBe(1);
    expect(router.url).toBe('/connexion');
    expect(alerte()).toBeNull();
  });

  it('bloque le bouton pendant la requête : un double clic ne déconnecte qu’une fois', async () => {
    bouton().click();
    fixture.detectChanges();

    expect(bouton().disabled).toBe(true);
    expect(bouton().textContent).toContain('Déconnexion…');
    bouton().click();
    expect(auth.appels).toBe(1);

    auth.confirmer();
    await stabiliser();
  });

  it('sur un échec réseau, reste sur la page et dit que la session est toujours ouverte', async () => {
    bouton().click();
    auth.echouer();
    await stabiliser();

    expect(router.url).toBe('/compte');
    expect(alerte()?.textContent).toContain('toujours connecté');
    expect(bouton().disabled).toBe(false);
    expect(bouton().textContent).toContain('Se déconnecter');
  });

  it('efface le message d’erreur dès qu’on réessaie', async () => {
    bouton().click();
    auth.echouer();
    await stabiliser();

    bouton().click();
    fixture.detectChanges();
    expect(alerte()).toBeNull();

    auth.confirmer();
    await stabiliser();
    expect(router.url).toBe('/connexion');
  });

  it('prend l’icône claire sur le bandeau sombre', () => {
    fixture.componentRef.setInput('fond', 'sombre');
    fixture.detectChanges();

    const icone = (fixture.nativeElement as HTMLElement).querySelector('img');
    expect(icone?.getAttribute('src')).toBe('icons/deconnexion-claire.svg');
  });
});

import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';

import { App } from './app';
import { routes } from './app.routes';
import type { UserProfile } from './core/api/api.types';
import { SessionService } from './core/api/session.service';
import { UsersService } from './core/api/users.service';

/** Visiteur sans compte : `/users/me` répond 401. */
class VisiteurDouble extends UsersService {
  override getMe(): Observable<UserProfile> {
    return throwError(() => new HttpErrorResponse({ status: 401 }));
  }
  override updateMe(): Observable<UserProfile> {
    return throwError(() => new HttpErrorResponse({ status: 401 }));
  }
}

describe('App (cadre commun et routes publiques)', () => {
  let fixture: ComponentFixture<App>;
  let router: Router;

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  async function ouvrir(url: string): Promise<void> {
    await router.navigateByUrl(url);
    await new Promise((resolve) => setTimeout(resolve));
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter(routes),
        { provide: UsersService, useClass: VisiteurDouble },
        { provide: SessionService, useValue: { logout: () => of(undefined) } },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(App);
    fixture.detectChanges();
  });

  it('mène une adresse inconnue vers la page introuvable, avec un retour à l’accueil', async () => {
    await ouvrir('/une/adresse/qui-n-existe-pas');

    expect(router.url).toBe('/une/adresse/qui-n-existe-pas');
    expect(element().querySelector('h1')?.textContent).toContain("s'est évaporée.");
    expect(element().querySelector('.introuvable__retour')?.getAttribute('href')).toBe('/');
    expect(element().querySelector('app-site-footer')).not.toBeNull();
  });

  it('pose le menu transparent sur la connexion, sans pied de page', async () => {
    await ouvrir('/connexion');

    expect(element().querySelector('app-site-header')?.classList.contains('est-plein')).toBe(false);
    expect(element().querySelector('.contenu')?.classList.contains('sous-le-menu')).toBe(false);
    expect(element().querySelector('app-site-footer')).toBeNull();
  });

  it('décale l’inscription sous le menu plein', async () => {
    await ouvrir('/inscription');

    expect(element().querySelector('app-site-header')?.classList.contains('est-plein')).toBe(true);
    expect(element().querySelector('.contenu')?.classList.contains('sous-le-menu')).toBe(true);
  });

  it('renvoie un visiteur qui ouvre un lien direct vers son compte à la connexion', async () => {
    await ouvrir('/compte/profil');

    expect(router.url).toBe('/connexion');
  });
});

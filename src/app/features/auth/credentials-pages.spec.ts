import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { environment } from '../../../environments/environment';
import { AuthApiService, AuthHttpService } from '../../core/api/auth-api.service';
import { UsersHttpService, UsersService } from '../../core/api/users.service';
import { SessionHttpService, SessionService } from '../../core/api/session.service';
import { mockUsers } from '../../core/api/mocks/fixtures/users.fixture';
import { AccessTokenStore } from '../../core/auth/access-token.store';
import { AuthStore } from '../../core/auth/auth.store';
import { credentialsInterceptor } from '../../core/interceptors/credentials-interceptor';
import { Connexion } from './connexion/connexion';
import { Inscription } from './inscription/inscription';

@Component({ template: '<p>Mon compte</p>' })
class AccountPage {}
const base = environment.apiBaseUrl;
const token = 'A'.repeat(43);

describe('Formulaires de connexion et inscription', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([credentialsInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthApiService, useClass: AuthHttpService },
        { provide: UsersService, useClass: UsersHttpService },
        { provide: SessionService, useClass: SessionHttpService },
        provideRouter([
          { path: 'connexion', component: Connexion },
          { path: 'inscription', component: Inscription },
          { path: 'compte', component: AccountPage },
        ]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  const ouvrir = async (url: string) => {
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    return harness.routeNativeElement as HTMLElement;
  };
  const saisir = (page: HTMLElement, type: string, value: string) => {
    const champ = page.querySelector<HTMLInputElement>(`input[type="${type}"]`)!;
    champ.value = value;
    champ.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const soumettre = (page: HTMLElement) =>
    page
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  const remplir = (page: HTMLElement) => {
    saisir(page, 'email', 'client@example.test');
    saisir(page, 'password', 'ValidPass1!');
  };
  const stabiliser = async () => {
    await harness.fixture.whenStable();
    harness.detectChanges();
  };

  it('connecte, envoie le Bearer à /users/me et récupère le rôle', async () => {
    const page = await ouvrir('/connexion');
    remplir(page);
    soumettre(page);
    soumettre(page);
    const login = http.expectOne(`${base}/auth/login`);
    expect(login.request.headers.get('X-CSRF-Protection')).toBe('1');
    login.flush({ accessToken: token, tokenType: 'Bearer', expiresIn: 86400 });
    const profil = await vi.waitFor(() => http.expectOne(`${base}/users/me`));
    expect(profil.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
    profil.flush({ ...mockUsers[0], role: 'ADMIN' });
    await vi.waitFor(() => expect(TestBed.inject(Router).url).toBe('/compte'));
    await stabiliser();
    expect(TestBed.inject(Router).url).toBe('/compte');
    expect(TestBed.inject(AuthStore).isAdmin()).toBe(true);
    expect(TestBed.inject(AccessTokenStore).get()).toBe(token);

    TestBed.inject(HttpClient)
      .get(`${base}/cart`)
      .subscribe({ error: () => undefined });
    http
      .expectOne(`${base}/cart`)
      .flush(
        { code: 'UNAUTHENTICATED', message: 'Session révoquée.' },
        { status: 401, statusText: 'Unauthorized' },
      );
    await stabiliser();
    expect(TestBed.inject(AccessTokenStore).get()).toBeNull();
    expect(TestBed.inject(AuthStore).user()).toBeNull();
    expect(TestBed.inject(Router).url).toBe('/connexion?session=expired');
    expect(harness.routeNativeElement?.textContent).toContain('Ta session a expiré');
  });

  it('affiche un refus de connexion et garde le profil déconnecté', async () => {
    const page = await ouvrir('/connexion');
    remplir(page);
    soumettre(page);
    http.expectOne(`${base}/auth/login`).flush(
      {
        statusCode: 401,
        code: 'INVALID_CREDENTIALS',
        message: 'Texte différent',
        requestId: 'trace-login',
      },
      { status: 401, statusText: 'Unauthorized' },
    );
    await stabiliser();
    expect(page.querySelector('[role="alert"]')?.textContent).toContain(
      'Email ou mot de passe incorrect',
    );
    expect(page.textContent).not.toContain('trace-login');
    expect(page.textContent).not.toContain('Référence');
    expect(TestBed.inject(AccessTokenStore).get()).toBeNull();
    http.expectNone(`${base}/users/me`);
  });

  it('propose le renvoi après EMAIL_NOT_CONFIRMED, avec une réponse générique', async () => {
    const page = await ouvrir('/connexion');
    remplir(page);
    soumettre(page);
    http
      .expectOne(`${base}/auth/login`)
      .flush(
        { statusCode: 403, code: 'EMAIL_NOT_CONFIRMED', message: 'Non confirmé.' },
        { status: 403, statusText: 'Forbidden' },
      );
    await stabiliser();
    [...page.querySelectorAll<HTMLButtonElement>('button')]
      .find((b) => b.textContent?.includes('Renvoyer la confirmation'))!
      .click();
    const req = http.expectOne(`${base}/auth/resend-confirmation`);
    expect(req.request.body).toEqual({ email: 'client@example.test' });
    req.flush(null, { status: 202, statusText: 'Accepted' });
    await stabiliser();
    expect(page.querySelector('[role="status"]')?.textContent).toContain(
      'Si cette adresse peut recevoir cet email',
    );
  });

  it('valide le formulaire d’inscription avant POST puis invite à consulter les emails sans connecter', async () => {
    const page = await ouvrir('/inscription');
    saisir(page, 'email', 'invalide');
    saisir(page, 'password', 'faible');
    soumettre(page);
    harness.detectChanges();
    http.expectNone(() => true);
    expect(page.querySelector('[aria-invalid="true"]')).not.toBeNull();
    remplir(page);
    soumettre(page);
    http.expectOne(`${base}/auth/register`).flush(null, { status: 202, statusText: 'Accepted' });
    await stabiliser();
    expect(page.querySelector('[role="status"]')?.textContent).toContain('Consulte tes emails');
    expect(page.textContent).toContain('Si cette adresse peut être inscrite');
    expect(TestBed.inject(Router).url).toBe('/inscription');
    expect(TestBed.inject(AccessTokenStore).get()).toBeNull();
    http.expectNone(`${base}/auth/login`);
    http.expectNone(`${base}/users/me`);
  });
});

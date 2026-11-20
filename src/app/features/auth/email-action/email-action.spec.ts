import { Location } from '@angular/common';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AuthApiService, AuthHttpService } from '../../../core/api/auth-api.service';
import { UsersService } from '../../../core/api/users.service';
import { SessionService } from '../../../core/api/session.service';
import { credentialsInterceptor } from '../../../core/interceptors/credentials-interceptor';
import { AccessTokenStore } from '../../../core/auth/access-token.store';
import { EmailAction } from './email-action';
import { environment } from '../../../../environments/environment';

@Component({ template: '' })
class LoginPage {}
const token = 'T'.repeat(43);
const base = `${environment.apiBaseUrl}/auth`;

describe('Parcours des liens email', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([credentialsInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthApiService, useClass: AuthHttpService },
        { provide: UsersService, useValue: { getMe: () => of(null) } },
        { provide: SessionService, useValue: { logout: () => of(undefined) } },
        provideRouter(
          [
            { path: 'confirm-email', component: EmailAction, data: { mode: 'confirm' } },
            { path: 'reset-password', component: EmailAction, data: { mode: 'reset' } },
            { path: 'forgot-password', component: EmailAction, data: { mode: 'forgot' } },
            { path: 'resend-confirmation', component: EmailAction, data: { mode: 'resend' } },
            { path: 'connexion', component: LoginPage },
          ],
          withComponentInputBinding(),
        ),
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
  const stabiliser = async () => {
    await harness.fixture.whenStable();
    harness.detectChanges();
  };

  it('efface le fragment sans consommer le jeton, puis confirme explicitement par POST', async () => {
    const page = await ouvrir(`/confirm-email#token=${token}`);
    expect(TestBed.inject(Location).path(true)).not.toContain(token);
    expect(page.textContent).not.toContain(token);
    expect(page.querySelector('input[type="hidden"]')).toBeNull();
    http.expectNone(() => true);
    const bouton = page.querySelector<HTMLButtonElement>('app-ui-button button')!;
    bouton.click();
    bouton.click();
    const req = http.expectOne(`${base}/confirm-email`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ token });
    expect(req.request.headers.get('X-CSRF-Protection')).toBe('1');
    req.flush(null, { status: 204, statusText: 'No Content' });
    await stabiliser();
    expect(page.textContent).toContain('Ton adresse email est confirmée');
    http.expectNone(() => true);
  });

  it.each([
    '/confirm-email',
    '/reset-password#token=invalide',
    `/confirm-email?token=${token}`,
    `/confirm-email#token=${token}&token=${token}`,
  ])('refuse un lien absent, mal formé ou hors fragment : %s', async (url) => {
    const page = await ouvrir(url);
    expect(page.querySelector('[role="alert"]')?.textContent).toContain('Lien invalide ou expiré');
    expect(page.querySelector('app-ui-button')).toBeNull();
    http.expectNone(() => true);
  });

  it('présente INVALID_TOKEN sans afficher la référence technique ni le jeton', async () => {
    const page = await ouvrir(`/confirm-email#token=${token}`);
    page.querySelector<HTMLButtonElement>('app-ui-button button')!.click();
    http
      .expectOne(`${base}/confirm-email`)
      .flush(
        { statusCode: 400, code: 'INVALID_TOKEN', message: 'Autre texte', requestId: 'trace-link' },
        { status: 400, statusText: 'Bad Request' },
      );
    await stabiliser();
    expect(page.querySelector('[role="alert"]')?.textContent).toContain('Lien invalide ou expiré');
    expect(page.textContent).not.toContain('trace-link');
    expect(page.textContent).not.toContain('Référence');
    expect(page.textContent).not.toContain(token);
    expect(page.querySelector('a[href="/resend-confirmation"]')).not.toBeNull();
  });

  it.each(['forgot-password', 'resend-confirmation'])(
    'envoie %s et garde un message générique après 202',
    async (route) => {
      const page = await ouvrir(`/${route}`);
      saisir(page, 'email', 'inconnu@example.test');
      soumettre(page);
      const req = http.expectOne(`${base}/${route}`);
      expect(req.request.body).toEqual({ email: 'inconnu@example.test' });
      req.flush(
        { message: 'Ce texte serveur ne doit pas révéler de compte' },
        { status: 202, statusText: 'Accepted' },
      );
      await stabiliser();
      expect(page.querySelector('[role="status"]')?.textContent).toContain(
        'Si cette adresse peut recevoir cet email',
      );
      expect(page.textContent).not.toContain('Ce texte serveur');
    },
  );

  it('ne transmet pas de mot de passe faible puis redirige après un reset confirmé', async () => {
    const tokens = TestBed.inject(AccessTokenStore);
    tokens.set({ accessToken: 'A'.repeat(43), tokenType: 'Bearer', expiresIn: 60 });
    const page = await ouvrir(`/reset-password#token=${token}`);
    expect(TestBed.inject(Location).path(true)).not.toContain(token);
    saisir(page, 'password', 'faible');
    soumettre(page);
    harness.detectChanges();
    http.expectNone(() => true);
    expect(page.textContent).toContain('De 8 à 128 caractères');
    saisir(page, 'password', 'ValidPass1!');
    soumettre(page);
    const req = http.expectOne(`${base}/reset-password`);
    expect(req.request.body).toEqual({ token, password: 'ValidPass1!' });
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush(null, { status: 204, statusText: 'No Content' });
    await stabiliser();
    expect(tokens.get()).toBeNull();
    expect(TestBed.inject(Router).url).toBe('/connexion?reset=success');
  });

  it('permet de réessayer après une indisponibilité temporaire', async () => {
    const page = await ouvrir('/forgot-password');
    saisir(page, 'email', 'client@example.test');
    soumettre(page);
    http
      .expectOne(`${base}/forgot-password`)
      .flush(null, { status: 503, statusText: 'Unavailable' });
    await stabiliser();
    expect(page.querySelector('[role="alert"]')?.textContent).toContain(
      'temporairement indisponible',
    );
    soumettre(page);
    http.expectOne(`${base}/forgot-password`).flush(null, { status: 202, statusText: 'Accepted' });
    await stabiliser();
    expect(page.querySelector('[role="status"]')).not.toBeNull();
  });
});

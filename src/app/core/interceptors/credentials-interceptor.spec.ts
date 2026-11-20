import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { environment } from '../../../environments/environment';

import { AccessTokenStore } from '../auth/access-token.store';
import { credentialsInterceptor } from './credentials-interceptor';

@Component({ template: '' })
class LoginPage {}

const API = environment.apiBaseUrl;

describe('credentialsInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'connexion', component: LoginPage }]),
        provideHttpClient(withInterceptors([credentialsInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controller.verify());

  it('envoie le cookie de session sur une lecture, sans en-tête CSRF', () => {
    http.get(`${API}/users/me`).subscribe();

    const request = controller.expectOne(`${API}/users/me`).request;
    expect(request.withCredentials).toBe(true);
    expect(request.headers.has('X-CSRF-Protection')).toBe(false);
  });

  it('ajoute l’en-tête CSRF exigé par l’API sur une mutation', () => {
    http.post(`${API}/auth/logout`, null).subscribe();
    http.patch(`${API}/users/me`, { firstName: 'Camille' }).subscribe();

    for (const url of [`${API}/auth/logout`, `${API}/users/me`]) {
      const request = controller.expectOne(url).request;
      expect(request.withCredentials).toBe(true);
      expect(request.headers.get('X-CSRF-Protection')).toBe('1');
    }
  });

  it('ne joint jamais le cookie à une requête vers un autre hôte', () => {
    http.post('https://exemple.test/collecte', null).subscribe();

    const request = controller.expectOne('https://exemple.test/collecte').request;
    expect(request.withCredentials).toBe(false);
    expect(request.headers.has('X-CSRF-Protection')).toBe(false);
  });
  it('ajoute le Bearer opaque aux appels API authentifiés', () => {
    TestBed.inject(AccessTokenStore).set({
      accessToken: 'A'.repeat(43),
      tokenType: 'Bearer',
      expiresIn: 60,
    });
    http.get(`${API}/users/me`).subscribe();
    const req = controller.expectOne(`${API}/users/me`);
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${'A'.repeat(43)}`);
    req.flush({});
  });

  it.each([`${API}-autre/users/me`, 'https://autre.example.test/api/users/me'])(
    'ne transmet pas le jeton à %s',
    (url) => {
      TestBed.inject(AccessTokenStore).set({
        accessToken: 'A'.repeat(43),
        tokenType: 'Bearer',
        expiresIn: 60,
      });
      http.get(url).subscribe();
      const req = controller.expectOne(url);
      expect(req.request.headers.has('Authorization')).toBe(false);
      expect(req.request.withCredentials).toBe(false);
      req.flush({});
    },
  );

  it('efface le jeton sur une réponse non authentifiée', () => {
    const tokens = TestBed.inject(AccessTokenStore);
    tokens.set({ accessToken: 'A'.repeat(43), tokenType: 'Bearer', expiresIn: 60 });
    http.get(`${API}/users/me`).subscribe({ error: () => undefined });
    controller
      .expectOne(`${API}/users/me`)
      .flush({ code: 'UNAUTHENTICATED' }, { status: 401, statusText: 'Unauthorized' });
    expect(tokens.get()).toBeNull();
  });

  it('une ancienne 401 ne supprime pas une nouvelle session', () => {
    const tokens = TestBed.inject(AccessTokenStore);
    tokens.set({ accessToken: 'A'.repeat(43), tokenType: 'Bearer', expiresIn: 60 });
    http.get(`${API}/users/me`).subscribe({ error: () => undefined });
    const ancienne = controller.expectOne(`${API}/users/me`);
    tokens.set({ accessToken: 'B'.repeat(43), tokenType: 'Bearer', expiresIn: 60 });
    ancienne.flush(null, { status: 401, statusText: 'Unauthorized' });
    expect(tokens.get()).toBe('B'.repeat(43));
  });
});

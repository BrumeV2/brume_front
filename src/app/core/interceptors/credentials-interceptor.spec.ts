import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { environment } from '../../../environments/environment';

import { credentialsInterceptor } from './credentials-interceptor';

const API = environment.apiBaseUrl;

describe('credentialsInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
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
});

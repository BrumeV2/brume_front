import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { environment } from '../../../environments/environment';

import type { User } from './api.types';
import { UsersHttpService, UsersService } from './users.service';

const PROFILE_URL = `${environment.apiBaseUrl}/users/me`;

const user: User = {
  id: 'e0000000-0000-4000-8000-000000000001',
  email: 'camille.martin@example.com',
  firstName: 'Camille',
  lastName: 'Martin',
  phone: '0612345678',
  role: 'CUSTOMER',
  createdAt: '2026-01-15T09:12:00.000Z',
};

describe('UsersHttpService', () => {
  let service: UsersService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: UsersService, useClass: UsersHttpService },
      ],
    });
    service = TestBed.inject(UsersService);
    http = TestBed.inject(HttpTestingController);
  });

  it('appelle GET /users/me', () => {
    service.getMe().subscribe();

    const request = http.expectOne(PROFILE_URL);
    expect(request.request.method).toBe('GET');
    request.flush(user);
    http.verify();
  });

  it('envoie uniquement les champs fournis en PATCH', () => {
    service.updateMe({ firstName: 'Camille-Rose' }).subscribe();

    const request = http.expectOne(PROFILE_URL);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ firstName: 'Camille-Rose' });
    request.flush({ ...user, firstName: 'Camille-Rose' });
    http.verify();
  });

  it("n'envoie jamais d'identifiant : la route cible le porteur du jeton", () => {
    service.updateMe({ phone: null }).subscribe();

    const request = http.expectOne(PROFILE_URL);
    expect(request.request.body).not.toHaveProperty('id');
    expect(request.request.body).not.toHaveProperty('email');
    expect(request.request.url).toBe(PROFILE_URL);
    request.flush({ ...user, phone: null });
    http.verify();
  });
});

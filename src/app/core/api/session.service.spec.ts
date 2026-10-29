import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';

import { environment } from '../../../environments/environment';

import { toApiError } from './api-error';
import { MockSession } from './mocks/mock-session';
import { SessionMockService } from './mocks/session.mock.service';
import { UsersMockService } from './mocks/users.mock.service';
import { SessionHttpService, SessionService } from './session.service';
import { UsersService } from './users.service';
import { BROWSER_STORAGE, InMemoryStorage } from '../storage/browser-storage';

describe('SessionHttpService', () => {
  let service: SessionService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: SessionService, useClass: SessionHttpService },
      ],
    });
    service = TestBed.inject(SessionService);
    http = TestBed.inject(HttpTestingController);
  });

  it('appelle POST /auth/logout et termine sur un 204', async () => {
    const resultat = firstValueFrom(service.logout(), { defaultValue: 'terminé' });

    const request = http.expectOne(`${environment.apiBaseUrl}/auth/logout`);
    expect(request.request.method).toBe('POST');
    request.flush(null, { status: 204, statusText: 'No Content' });

    expect(await resultat).toBeNull();
    http.verify();
  });
});

describe('SessionMockService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: BROWSER_STORAGE, useValue: new InMemoryStorage() },
        { provide: SessionService, useClass: SessionMockService },
        { provide: UsersService, useClass: UsersMockService },
      ],
    });
  });

  it('ferme la session simulée : /users/me répond ensuite 401, comme le vrai back', async () => {
    const users = TestBed.inject(UsersService);
    await firstValueFrom(users.getMe());

    await firstValueFrom(TestBed.inject(SessionService).logout(), { defaultValue: undefined });

    expect(TestBed.inject(MockSession).isOpen).toBe(false);
    const erreur = await firstValueFrom(users.getMe()).then(
      () => null,
      (error: unknown) => toApiError(error),
    );
    expect(erreur?.statusCode).toBe(401);
    expect(erreur?.code).toBe('UNAUTHENTICATED');
  });
});

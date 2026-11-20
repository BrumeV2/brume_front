import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Observable, Subject, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { environment } from '../../../environments/environment';
import type { UpdateProfileDraft, UserProfile } from '../api/api.types';
import { mockUsers } from '../api/mocks/fixtures/users.fixture';
import { SessionService } from '../api/session.service';
import { UsersService } from '../api/users.service';

import { AuthApiService } from '../api/auth-api.service';
import { AccessTokenStore } from './access-token.store';
import { AuthService } from './auth.service';
import { AuthStore } from './auth.store';

/** Le compte du seed : un seul endroit à corriger quand le contrat change. */
const client: UserProfile = mockUsers[0];

function erreur(status: number): HttpErrorResponse {
  return new HttpErrorResponse({ status, url: `${environment.apiBaseUrl}/users/me` });
}

class UsersDouble extends UsersService {
  appels = 0;
  reponse: () => Observable<UserProfile> = () => of(client);

  override getMe(): Observable<UserProfile> {
    this.appels++;
    return this.reponse();
  }

  override updateMe(_payload: UpdateProfileDraft): Observable<UserProfile> {
    return of(client);
  }
}

class SessionDouble extends SessionService {
  appels = 0;
  reponse: () => Observable<void> = () => of(undefined);

  override logout(): Observable<void> {
    this.appels++;
    return this.reponse();
  }
}

describe('AuthService', () => {
  let auth: AuthService;
  let store: AuthStore;
  let users: UsersDouble;
  let session: SessionDouble;

  beforeEach(() => {
    users = new UsersDouble();
    session = new SessionDouble();
    TestBed.configureTestingModule({
      providers: [
        { provide: UsersService, useValue: users },
        { provide: SessionService, useValue: session },
      ],
    });
    auth = TestBed.inject(AuthService);
    store = TestBed.inject(AuthStore);
  });

  /** Ouvre la session comme le fait la garde d'une page du compte. */
  async function connecter(): Promise<void> {
    await auth.currentUser();
  }

  it('pointe le bouton Google vers le parcours OAuth de l’API', () => {
    expect(auth.googleLoginUrl).toBe(`${environment.apiBaseUrl}/auth/google`);
  });

  it('interroge /users/me une seule fois et alimente le store du profil', async () => {
    const [premier, second] = await Promise.all([auth.currentUser(), auth.currentUser()]);

    expect(premier).toEqual(client);
    expect(second).toEqual(client);
    expect(await auth.currentUser()).toEqual(client);
    expect(users.appels).toBe(1);
    expect(store.user()).toEqual(client);
    expect(auth.isAuthenticated()).toBe(true);
  });

  it('mémorise un visiteur non connecté sur une 401', async () => {
    users.reponse = () => throwError(() => erreur(401));

    expect(await auth.currentUser()).toBeNull();
    expect(await auth.currentUser()).toBeNull();
    expect(users.appels).toBe(1);
  });

  it('ne mémorise pas une API indisponible : la question sera reposée', async () => {
    users.reponse = () => throwError(() => erreur(503));
    expect(await auth.currentUser()).toBeNull();

    users.reponse = () => of(client);
    expect(await auth.currentUser()).toEqual(client);
    expect(users.appels).toBe(2);
  });

  describe('logout', () => {
    it('révoque la session puis efface tout ce que le front sait du client', async () => {
      await connecter();

      await auth.logout();

      expect(session.appels).toBe(1);
      expect(auth.isAuthenticated()).toBe(false);
      expect(store.user()).toBeNull();
      expect(store.status()).toBe('idle');
      // Plus d'accès authentifié : la garde suivante voit un visiteur, sans redemander à l'API.
      expect(await auth.currentUser()).toBeNull();
      expect(users.appels).toBe(1);
    });

    it('ne prétend pas avoir déconnecté si l’API n’a pas confirmé (réseau coupé)', async () => {
      await connecter();
      session.reponse = () => throwError(() => new HttpErrorResponse({ status: 0 }));

      await expect(auth.logout()).rejects.toBeInstanceOf(HttpErrorResponse);

      expect(auth.isAuthenticated()).toBe(true);
      expect(store.user()).toEqual(client);
    });

    it('ne prétend pas avoir déconnecté si l’API répond en erreur (503)', async () => {
      await connecter();
      session.reponse = () => throwError(() => erreur(503));

      await expect(auth.logout()).rejects.toBeInstanceOf(HttpErrorResponse);

      expect(auth.isAuthenticated()).toBe(true);
      expect(store.user()).toEqual(client);
    });
  });
});

describe('AuthService — connexion email', () => {
  let auth: AuthService;
  let users: UsersDouble;
  let tokens: AccessTokenStore;
  let api: { login: ReturnType<typeof vi.fn> };
  beforeEach(() => {
    users = new UsersDouble();
    api = {
      login: vi.fn(() => of({ accessToken: 'A'.repeat(43), tokenType: 'Bearer', expiresIn: 60 })),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: UsersService, useValue: users },
        { provide: SessionService, useValue: new SessionDouble() },
        { provide: AuthApiService, useValue: api },
      ],
    });
    auth = TestBed.inject(AuthService);
    tokens = TestBed.inject(AccessTokenStore);
  });

  it('charge le profil et le rôle après connexion, même après une visite anonyme en cache', async () => {
    users.reponse = () => throwError(() => erreur(401));
    await auth.currentUser();
    users.reponse = () => of({ ...client, role: 'ADMIN' });
    await auth.login({ email: client.email, password: 'ValidPass1!' });
    expect(api.login).toHaveBeenCalledWith({ email: client.email, password: 'ValidPass1!' });
    expect(tokens.get()).toBe('A'.repeat(43));
    expect(auth.isAuthenticated()).toBe(true);
    expect(TestBed.inject(AuthStore).isAdmin()).toBe(true);
    expect(users.appels).toBe(2);
  });

  it('ne confirme pas de connexion si /users/me échoue', async () => {
    users.reponse = () => throwError(() => erreur(503));
    await expect(
      auth.login({ email: client.email, password: 'ValidPass1!' }),
    ).rejects.toBeInstanceOf(HttpErrorResponse);
    expect(tokens.get()).toBeNull();
    expect(auth.isAuthenticated()).toBe(false);
    expect(TestBed.inject(AuthStore).user()).toBeNull();
  });

  it('ne garde aucun jeton après un refus de connexion', async () => {
    api.login.mockReturnValue(throwError(() => erreur(401)));
    await expect(auth.login({ email: client.email, password: 'wrong' })).rejects.toBeInstanceOf(
      HttpErrorResponse,
    );
    expect(tokens.get()).toBeNull();
    expect(users.appels).toBe(0);
  });

  it('oublie profil et rôle quand le jeton est invalidé', async () => {
    await auth.login({ email: client.email, password: 'ValidPass1!' });
    tokens.invalidate();
    expect(TestBed.inject(AuthStore).user()).toBeNull();
    expect(await auth.currentUser()).toBeNull();
  });

  it('ne rétablit pas le profil avec une réponse arrivée après une déconnexion', async () => {
    const reponse = new Subject<UserProfile>();
    users.reponse = () => reponse;
    const chargement = auth.currentUser();
    auth.forgetSession();
    reponse.next(client);
    expect(await chargement).toBeNull();
    expect(auth.isAuthenticated()).toBe(false);
    expect(TestBed.inject(AuthStore).user()).toBeNull();
  });
});

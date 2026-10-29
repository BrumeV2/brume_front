import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { User } from './user';

const api = environment.apiUrl;

const client: User = {
  id: '6f1c2c1e-0000-4000-8000-000000000001',
  email: 'client@brume.test',
  firstName: 'Camille',
  lastName: null,
  phone: null,
  role: 'CUSTOMER',
  status: 'ACTIVE',
  emailVerifiedAt: '2026-10-27T10:00:00.000Z',
  createdAt: '2026-10-27T10:00:00.000Z',
  updatedAt: '2026-10-27T10:00:00.000Z',
};

describe('AuthService', () => {
  let auth: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('pointe le bouton Google vers le parcours OAuth de l’API', () => {
    expect(auth.googleLoginUrl).toBe(`${api}/auth/google`);
  });

  it('récupère le client connecté avec le cookie de session, une seule fois', async () => {
    const premier = auth.currentUser();
    const second = auth.currentUser();

    const req = http.expectOne(`${api}/users/me`);
    expect(req.request.withCredentials).toBe(true);
    req.flush(client);

    expect(await premier).toEqual(client);
    expect(await second).toEqual(client);
    expect(auth.isAuthenticated()).toBe(true);

    // En cache : aucune nouvelle requête.
    expect(await auth.currentUser()).toEqual(client);
  });

  it('mémorise un visiteur non connecté sur une 401', async () => {
    const resultat = auth.currentUser();
    http
      .expectOne(`${api}/users/me`)
      .flush({ code: 'UNAUTHENTICATED' }, { status: 401, statusText: 'Unauthorized' });

    expect(await resultat).toBeNull();
    expect(await auth.currentUser()).toBeNull();
    expect(auth.isAuthenticated()).toBe(false);
  });

  it('ne mémorise pas une API indisponible : la question sera reposée', async () => {
    const resultat = auth.currentUser();
    http
      .expectOne(`${api}/users/me`)
      .flush({ code: 'AUTH_UNAVAILABLE' }, { status: 503, statusText: 'Service Unavailable' });
    expect(await resultat).toBeNull();

    const nouvelEssai = auth.currentUser();
    http.expectOne(`${api}/users/me`).flush(client);
    expect(await nouvelEssai).toEqual(client);
  });

  it('déconnecte avec l’en-tête CSRF exigé par l’API', async () => {
    const chargement = auth.currentUser();
    http.expectOne(`${api}/users/me`).flush(client);
    await chargement;

    const deconnexion = auth.logout();
    const req = http.expectOne(`${api}/auth/logout`);
    expect(req.request.method).toBe('POST');
    expect(req.request.withCredentials).toBe(true);
    expect(req.request.headers.get('X-CSRF-Protection')).toBe('1');
    req.flush(null, { status: 204, statusText: 'No Content' });

    await deconnexion;
    expect(auth.user()).toBeNull();
  });

  it('reste connecté si l’API n’a pas confirmé la déconnexion', async () => {
    const chargement = auth.currentUser();
    http.expectOne(`${api}/users/me`).flush(client);
    await chargement;

    const deconnexion = auth.logout();
    http
      .expectOne(`${api}/auth/logout`)
      .flush({ code: 'AUTH_UNAVAILABLE' }, { status: 503, statusText: 'Service Unavailable' });

    await expect(deconnexion).rejects.toBeTruthy();
    expect(auth.user()).toEqual(client);
  });
});

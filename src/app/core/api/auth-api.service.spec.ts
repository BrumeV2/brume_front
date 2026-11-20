import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AuthApiService, AuthHttpService } from './auth-api.service';
import { AccessTokenStore } from '../auth/access-token.store';
import { credentialsInterceptor } from '../interceptors/credentials-interceptor';
import { environment } from '../../../environments/environment';

const base = `${environment.apiBaseUrl}/auth`;
describe('AuthHttpService', () => {
  let api: AuthApiService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([credentialsInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthApiService, useClass: AuthHttpService },
      ],
    });
    api = TestBed.inject(AuthApiService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('connecte par POST, sans ancien Bearer et avec CSRF, sans modifier le mot de passe', () => {
    TestBed.inject(AccessTokenStore).set({
      accessToken: 'A'.repeat(43),
      tokenType: 'Bearer',
      expiresIn: 60,
    });
    api.login({ email: ' client@example.test ', password: ' Secret1! ' }).subscribe();
    const req = http.expectOne(`${base}/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'client@example.test', password: ' Secret1! ' });
    expect(req.request.headers.has('Authorization')).toBe(false);
    expect(req.request.headers.get('X-CSRF-Protection')).toBe('1');
    expect(req.request.withCredentials).toBe(true);
    req.flush({ accessToken: 'B'.repeat(43), tokenType: 'Bearer', expiresIn: 86400 });
  });

  it.each([
    {
      route: 'register',
      call: (s: AuthApiService) =>
        s.register({ email: 'client@example.test', password: 'ValidPass1!' }),
      body: { email: 'client@example.test', password: 'ValidPass1!' },
      status: 202,
    },
    {
      route: 'forgot-password',
      call: (s: AuthApiService) => s.forgotPassword({ email: 'client@example.test' }),
      body: { email: 'client@example.test' },
      status: 202,
    },
    {
      route: 'resend-confirmation',
      call: (s: AuthApiService) => s.resendConfirmation({ email: 'client@example.test' }),
      body: { email: 'client@example.test' },
      status: 202,
    },
    {
      route: 'confirm-email',
      call: (s: AuthApiService) => s.confirmEmail({ token: 'T'.repeat(43) }),
      body: { token: 'T'.repeat(43) },
      status: 204,
    },
    {
      route: 'reset-password',
      call: (s: AuthApiService) =>
        s.resetPassword({ token: 'T'.repeat(43), password: 'ValidPass1!' }),
      body: { token: 'T'.repeat(43), password: 'ValidPass1!' },
      status: 204,
    },
  ])('appelle $route en POST, avec le corps attendu', ({ route, call, body, status }) => {
    call(api).subscribe();
    const req = http.expectOne(`${base}/${route}`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    expect(req.request.headers.get('X-CSRF-Protection')).toBe('1');
    expect(req.request.params.keys()).toEqual([]);
    req.flush(null, { status, statusText: status === 202 ? 'Accepted' : 'No Content' });
  });
});

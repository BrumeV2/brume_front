import { HttpClient, HttpContext, HttpContextToken } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import type { components } from './schema';

export type Credentials = components['schemas']['LoginRequest'];
export type Registration = components['schemas']['RegisterRequest'];
export type AccessTokenResponse = components['schemas']['AccessTokenResponse'];
export type EmailRequest = components['schemas']['EmailRequest'];
export type AccountTokenRequest = components['schemas']['AccountTokenRequest'];
export type ResetPasswordRequest = components['schemas']['ResetPasswordRequest'];

/** Ces opérations anonymes ne doivent jamais envoyer un ancien Bearer. */
export const PUBLIC_AUTH_REQUEST = new HttpContextToken(() => false);

@Injectable()
export abstract class AuthApiService {
  abstract login(payload: Credentials): Observable<AccessTokenResponse>;
  abstract register(payload: Registration): Observable<void>;
  abstract confirmEmail(payload: AccountTokenRequest): Observable<void>;
  abstract resendConfirmation(payload: EmailRequest): Observable<void>;
  abstract forgotPassword(payload: EmailRequest): Observable<void>;
  abstract resetPassword(payload: ResetPasswordRequest): Observable<void>;
}

@Injectable()
export class AuthHttpService extends AuthApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/auth`;

  override login(payload: Credentials): Observable<AccessTokenResponse> {
    return this.post<AccessTokenResponse>('login', {
      email: payload.email.trim(),
      password: payload.password,
    });
  }
  override register(payload: Registration): Observable<void> {
    return this.post('register', { email: payload.email.trim(), password: payload.password });
  }
  override confirmEmail(payload: AccountTokenRequest): Observable<void> {
    return this.post('confirm-email', { token: payload.token });
  }
  override resendConfirmation(payload: EmailRequest): Observable<void> {
    return this.post('resend-confirmation', { email: payload.email.trim() });
  }
  override forgotPassword(payload: EmailRequest): Observable<void> {
    return this.post('forgot-password', { email: payload.email.trim() });
  }
  override resetPassword(payload: ResetPasswordRequest): Observable<void> {
    return this.post('reset-password', { token: payload.token, password: payload.password });
  }
  private post<T = void>(route: string, body: unknown): Observable<T> {
    return this.http.post<T>(`${this.base}/${route}`, body, {
      context: new HttpContext().set(PUBLIC_AUTH_REQUEST, true),
    });
  }
}

import { Injectable, inject } from '@angular/core';
import { tap, type Observable } from 'rxjs';
import { AuthApiService, type AccessTokenResponse, type Credentials } from '../auth-api.service';
import { mockFail, mockOk } from './mock-delay';
import { MockSession } from './mock-session';
import { mockUsers } from './fixtures/users.fixture';

/** Démonstration locale uniquement ; aucune livraison d'email n'est simulée. */
@Injectable()
export class AuthMockService extends AuthApiService {
  private readonly session = inject(MockSession);
  override login(payload: Credentials): Observable<AccessTokenResponse> {
    const user = mockUsers.find((candidate) => candidate.email === payload.email.trim());
    if (!user || !payload.password) {
      return mockFail(401, 'INVALID_CREDENTIALS', 'Email ou mot de passe incorrect');
    }
    return mockOk({
      accessToken: 'M'.repeat(43),
      tokenType: 'Bearer' as const,
      expiresIn: 86400,
    }).pipe(tap(() => this.session.openAs(user.id)));
  }
  override register(): Observable<void> {
    return mockOk(undefined);
  }
  override confirmEmail(): Observable<void> {
    return mockOk(undefined);
  }
  override resendConfirmation(): Observable<void> {
    return mockOk(undefined);
  }
  override forgotPassword(): Observable<void> {
    return mockOk(undefined);
  }
  override resetPassword(): Observable<void> {
    return mockOk(undefined).pipe(tap(() => this.session.close()));
  }
}

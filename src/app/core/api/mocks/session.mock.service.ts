import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { SessionService } from '../session.service';

import { MockSession } from './mock-session';
import { mockOk } from './mock-delay';

/**
 * Implémentation simulée de `/auth/logout`.
 *
 * Comme le back : la déconnexion est idempotente et ferme la session de cet
 * appareil, après quoi `/users/me` répond 401 (voir `UsersMockService`).
 */
@Injectable()
export class SessionMockService extends SessionService {
  private readonly session = inject(MockSession);

  override logout(): Observable<void> {
    return mockOk(undefined).pipe(tap(() => this.session.close()));
  }
}

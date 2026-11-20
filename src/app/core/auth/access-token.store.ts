import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import type { AccessTokenResponse } from '../api/auth-api.service';

/** Jeton opaque en mémoire uniquement : ni stockage navigateur ni décodage JWT. */
@Injectable({ providedIn: 'root' })
export class AccessTokenStore {
  private token: string | null = null;
  private expiresAt = 0;
  private revision = 0;
  private readonly invalidation = new Subject<void>();
  readonly invalidated = this.invalidation.asObservable();
  get version(): number {
    return this.revision;
  }

  set(response: AccessTokenResponse): void {
    if (
      !/^[A-Za-z0-9_-]{43}$/.test(response.accessToken) ||
      response.tokenType !== 'Bearer' ||
      !Number.isSafeInteger(response.expiresIn) ||
      response.expiresIn <= 0
    ) {
      throw new Error('Réponse de connexion invalide.');
    }
    this.token = response.accessToken;
    this.expiresAt = Date.now() + response.expiresIn * 1000;
    this.revision++;
  }
  get(): string | null {
    if (this.token !== null && Date.now() >= this.expiresAt) this.invalidate();
    return this.token;
  }
  invalidate(): void {
    this.token = null;
    this.expiresAt = 0;
    this.revision++;
    this.invalidation.next();
  }
}

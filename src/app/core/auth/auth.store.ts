import { Injectable, computed, inject, signal } from '@angular/core';

import { toApiError, type ApiError } from '../api/api-error';
import type { UserProfile } from '../api/api.types';
import { UsersService } from '../api/users.service';

/** État du chargement du profil courant. */
export type AuthStatus = 'idle' | 'loading' | 'ready' | 'error';

/**
 * Utilisateur connecté, partagé par toute l'application (en-tête, pages du compte).
 *
 * Tant que la connexion n'est pas implémentée (US-045, US-046), la session est
 * celle que renvoie `UsersService` : un compte de test en mode simulé, le
 * porteur du jeton une fois le back branché. Ce store est l'endroit où la
 * connexion viendra se greffer, sans toucher aux pages.
 */
@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly usersService = inject(UsersService);

  private readonly userSignal = signal<UserProfile | null>(null);
  private readonly statusSignal = signal<AuthStatus>('idle');
  private readonly errorSignal = signal<ApiError | null>(null);

  readonly user = this.userSignal.asReadonly();
  readonly status = this.statusSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  readonly isAuthenticated = computed(() => this.userSignal() !== null);
  readonly isAdmin = computed(() => this.userSignal()?.role === 'ADMIN');
  readonly fullName = computed(() => {
    const user = this.userSignal();
    return user === null ? '' : `${user.firstName} ${user.lastName}`.trim();
  });

  /** Charge le profil courant. Rejouable : un échec peut être réessayé. */
  load(): void {
    this.statusSignal.set('loading');
    this.errorSignal.set(null);

    this.usersService.getMe().subscribe({
      next: (user) => {
        this.userSignal.set(user);
        this.statusSignal.set('ready');
      },
      error: (error: unknown) => {
        this.userSignal.set(null);
        this.errorSignal.set(toApiError(error));
        this.statusSignal.set('error');
      },
    });
  }

  /** Enregistre le profil renvoyé par l'API après une modification réussie. */
  setUser(user: UserProfile): void {
    this.userSignal.set(user);
    this.statusSignal.set('ready');
    this.errorSignal.set(null);
  }
}

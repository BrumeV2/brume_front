import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { toApiError } from '../api/api-error';
import type { UserProfile } from '../api/api.types';
import { SessionService } from '../api/session.service';
import { UsersService } from '../api/users.service';

import { AuthStore } from './auth.store';

/**
 * Session Brume, adossée au parcours Google SSO de l'API (brume_back, docs/AUTH.md).
 *
 * L'API pose un cookie HttpOnly `brume_session` : le front ne voit jamais de jeton.
 * Il navigue vers `/auth/google`, puis interroge `/users/me` (via `UsersService`,
 * donc simulable) pour savoir qui est connecté. Le profil obtenu alimente
 * `AuthStore`, que les pages lisent pour l'affichage.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly users = inject(UsersService);
  private readonly session = inject(SessionService);
  private readonly store = inject(AuthStore);

  /** Navigation pleine page (pas un appel XHR) : l'API redirige vers Google. */
  readonly googleLoginUrl = `${environment.apiBaseUrl}/auth/google`;

  // undefined = pas encore demandé à l'API, null = visiteur non connecté.
  private readonly state = signal<UserProfile | null | undefined>(undefined);
  private pending?: Promise<UserProfile | null>;

  readonly isAuthenticated = computed(() => !!this.state());

  /** Utilisateur courant, interrogé une seule fois puis mis en cache. */
  currentUser(): Promise<UserProfile | null> {
    const known = this.state();
    if (known !== undefined) return Promise.resolve(known);

    this.pending ??= firstValueFrom(this.users.getMe())
      .then(
        (user) => {
          this.state.set(user);
          this.store.setUser(user);
          return user;
        },
        (error: unknown) => {
          // Seule une 401 prouve l'absence de session. Une API injoignable ou en 503
          // ne doit pas être mémorisée comme « déconnecté » : on redemandera.
          if (toApiError(error).statusCode === 401) this.state.set(null);
          return null;
        },
      )
      .finally(() => (this.pending = undefined));

    return this.pending;
  }

  /**
   * Révoque la session de cet appareil, puis efface tout ce que le front sait du client.
   *
   * Rejette si l'API n'a pas confirmé : la session existe peut-être encore, donc
   * rien n'est effacé et l'interface ne doit pas prétendre que le client est déconnecté.
   */
  async logout(): Promise<void> {
    await firstValueFrom(this.session.logout(), { defaultValue: undefined });
    this.state.set(null);
    this.store.clear();
  }
}

import { Injectable, Injector, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthApiService, type Credentials } from '../api/auth-api.service';
import { AccessTokenStore } from './access-token.store';
import { toApiError } from '../api/api-error';
import type { UserProfile } from '../api/api.types';
import { SessionService } from '../api/session.service';
import { UsersService } from '../api/users.service';

import { AuthStore } from './auth.store';

/** Session par jeton opaque ou cookie Google, avec profil fourni par /users/me. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly injector = inject(Injector);
  private readonly tokens = inject(AccessTokenStore);
  private generation = 0;
  private readonly users = inject(UsersService);
  private readonly session = inject(SessionService);
  private readonly store = inject(AuthStore);

  /** Navigation pleine page (pas un appel XHR) : l'API redirige vers Google. */
  readonly googleLoginUrl = `${environment.apiBaseUrl}/auth/google`;

  // undefined = pas encore demandé à l'API, null = visiteur non connecté.
  private readonly state = signal<UserProfile | null | undefined>(undefined);
  private pending?: Promise<UserProfile | null>;

  readonly isAuthenticated = computed(() => !!this.state());

  constructor() {
    this.tokens.invalidated.pipe(takeUntilDestroyed()).subscribe(() => {
      this.generation++;
      this.pending = undefined;
      this.state.set(null);
      this.store.clear();
    });
  }

  /** Connexion email, puis lecture du profil : aucun décodage du jeton. */
  async login(payload: Credentials): Promise<UserProfile> {
    this.forgetSession();
    const generation = this.generation;
    try {
      const response = await firstValueFrom(this.injector.get(AuthApiService).login(payload));
      if (generation !== this.generation) throw new Error('La connexion a été interrompue.');
      this.tokens.set(response);
      const user = await firstValueFrom(this.users.getMe());
      if (generation !== this.generation) throw new Error('La connexion a été interrompue.');
      this.state.set(user);
      this.store.setUser(user);
      return user;
    } catch (error) {
      if (generation === this.generation) this.forgetSession();
      throw error;
    }
  }

  /** Après expiration ou réinitialisation confirmée, oublie la session locale. */
  forgetSession(): void {
    this.tokens.invalidate();
  }

  /** Utilisateur courant, interrogé une seule fois puis mis en cache. */
  currentUser(): Promise<UserProfile | null> {
    this.tokens.get(); // Expiration locale, sans tenter de décoder un JWT.
    const known = this.state();
    if (known !== undefined) return Promise.resolve(known);

    const generation = this.generation;
    this.pending ??= firstValueFrom(this.users.getMe())
      .then(
        (user) => {
          if (generation !== this.generation) return null;
          this.state.set(user);
          this.store.setUser(user);
          return user;
        },
        (error: unknown) => {
          // Seule une 401 prouve l'absence de session. Une API injoignable ou en 503
          // ne doit pas être mémorisée comme « déconnecté » : on redemandera.
          if (generation === this.generation && toApiError(error).statusCode === 401)
            this.state.set(null);
          return null;
        },
      )
      .finally(() => {
        if (generation === this.generation) this.pending = undefined;
      });

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
    this.forgetSession();
  }
}

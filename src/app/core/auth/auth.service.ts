import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User } from './user';

/**
 * Session Brume, adossée au parcours Google SSO de l'API (brume_back, docs/AUTH.md).
 *
 * L'API pose un cookie HttpOnly `brume_session` : le front ne voit jamais de jeton.
 * Il se contente de naviguer vers `/auth/google`, puis d'interroger `/users/me`
 * avec les cookies pour savoir qui est connecté.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiBaseUrl;

  /** Navigation pleine page (pas un appel XHR) : l'API redirige vers Google. */
  readonly googleLoginUrl = `${this.apiUrl}/auth/google`;

  // undefined = pas encore demandé à l'API, null = visiteur non connecté.
  private readonly state = signal<User | null | undefined>(undefined);
  private pending?: Promise<User | null>;

  readonly user = computed(() => this.state() ?? null);
  readonly isAuthenticated = computed(() => !!this.state());

  /** Utilisateur courant, interrogé une seule fois puis mis en cache. */
  currentUser(): Promise<User | null> {
    const known = this.state();
    if (known !== undefined) return Promise.resolve(known);

    this.pending ??= firstValueFrom(
      this.http.get<User>(`${this.apiUrl}/users/me`, { withCredentials: true }),
    )
      .then(
        (user) => {
          this.state.set(user);
          return user;
        },
        (error: unknown) => {
          // Seule une 401 prouve l'absence de session. Une API injoignable ou en 503
          // ne doit pas être mémorisée comme « déconnecté » : on redemandera.
          if (error instanceof HttpErrorResponse && error.status === 401) this.state.set(null);
          return null;
        },
      )
      .finally(() => (this.pending = undefined));

    return this.pending;
  }

  /**
   * Révoque la session côté API. Rejette si le serveur n'a pas confirmé (204) :
   * dans ce cas la session existe peut-être encore et l'interface ne doit pas
   * prétendre le contraire.
   */
  async logout(): Promise<void> {
    await firstValueFrom(
      this.http.post<void>(`${this.apiUrl}/auth/logout`, null, {
        withCredentials: true,
        // Exigé par l'API sur toute mutation (protection CSRF).
        headers: new HttpHeaders({ 'X-CSRF-Protection': '1' }),
      }),
    );
    this.state.set(null);
  }
}

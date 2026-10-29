import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

/**
 * Contrat d'accès à la session de l'appareil courant.
 *
 * Sert de jeton d'injection : `app.config.ts` fournit `SessionHttpService` ou
 * `SessionMockService` selon `environment.useMocks`.
 *
 * L'ouverture de session n'est pas ici : c'est une navigation pleine page vers
 * `/auth/google` (voir `AuthService.googleLoginUrl`), pas un appel HTTP.
 */
@Injectable()
export abstract class SessionService {
  /**
   * `POST /auth/logout` — révoque la session de cet appareil uniquement (ADD-087).
   *
   * Termine sans valeur sur un 204. Toute autre issue est une erreur : la
   * révocation n'est alors pas prouvée.
   */
  abstract logout(): Observable<void>;
}

/** Implémentation réelle. Cookies et en-tête CSRF sont ajoutés par `credentialsInterceptor`. */
@Injectable()
export class SessionHttpService extends SessionService {
  private readonly http = inject(HttpClient);

  override logout(): Observable<void> {
    return this.http.post<void>(`${environment.apiBaseUrl}/auth/logout`, null);
  }
}

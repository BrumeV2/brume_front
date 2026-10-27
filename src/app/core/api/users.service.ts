import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

import type { UpdateProfileRequest, User } from './api.types';

/**
 * Contrat d'accès aux routes `/users/me`.
 *
 * Sert de jeton d'injection : `app.config.ts` fournit soit `UsersHttpService`,
 * soit `UsersMockService` selon `environment.useMocks`. Aucun composant ne
 * connaît l'implémentation qu'il reçoit.
 */
@Injectable()
export abstract class UsersService {
  /** `GET /users/me` — profil du client connecté (US-047). */
  abstract getMe(): Observable<User>;

  /**
   * `PATCH /users/me` — modification du profil (US-047).
   *
   * Seuls `firstName`, `lastName` et `phone` sont modifiables : l'email et le rôle
   * n'existent pas dans `UpdateProfileRequest`. Le corps doit porter au moins un
   * champ (`minProperties: 1` dans le contrat).
   */
  abstract updateMe(payload: UpdateProfileRequest): Observable<User>;
}

/** Implémentation réelle, utilisée dès que le back est disponible. */
@Injectable()
export class UsersHttpService extends UsersService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/users/me`;

  override getMe(): Observable<User> {
    return this.http.get<User>(this.baseUrl);
  }

  override updateMe(payload: UpdateProfileRequest): Observable<User> {
    return this.http.patch<User>(this.baseUrl, payload);
  }
}

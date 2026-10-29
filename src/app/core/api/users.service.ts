import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

import type { UpdateProfileDraft, UserProfile } from './api.types';

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
  abstract getMe(): Observable<UserProfile>;

  /**
   * `PATCH /users/me` — modification du profil (US-047).
   *
   * L'email et le rôle ne sont jamais modifiables : ils n'existent pas dans
   * `UpdateProfileRequest`. Le corps doit porter au moins un champ
   * (`minProperties: 1` dans le contrat).
   *
   * `birthDate` n'est pas encore au contrat : voir la note « HORS CONTRAT »
   * dans `api.types.ts`.
   */
  abstract updateMe(payload: UpdateProfileDraft): Observable<UserProfile>;
}

/** Implémentation réelle, utilisée dès que le back est disponible. */
@Injectable()
export class UsersHttpService extends UsersService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/users/me`;

  override getMe(): Observable<UserProfile> {
    return this.http.get<UserProfile>(this.baseUrl);
  }

  override updateMe(payload: UpdateProfileDraft): Observable<UserProfile> {
    return this.http.patch<UserProfile>(this.baseUrl, payload);
  }
}

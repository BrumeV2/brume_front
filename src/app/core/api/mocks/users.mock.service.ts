import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { BROWSER_STORAGE } from '../../storage/browser-storage';
import type { UpdateProfileDraft, UserProfile } from '../api.types';
import { EDITABLE_PROFILE_FIELDS, PROFILE_RULES } from '../profile-rules';
import { UsersService } from '../users.service';

import { MOCK_CUSTOMER_ID, mockUsers } from './fixtures/users.fixture';
import { mockFail, mockOk } from './mock-delay';
import { MockSession } from './mock-session';

const STORAGE_KEY = 'brume.mock.users';
const PATH = '/api/users/me';

/**
 * Identifiant du compte considéré comme connecté tant que `MockSession` est
 * ouverte. Le vrai back déduit cet identifiant du cookie de session : le front
 * ne l'envoie jamais.
 */
const CURRENT_USER_ID = MOCK_CUSTOMER_ID;

interface ValidationDetail {
  // L'index est exigé par le type `details` du contrat.
  [key: string]: unknown;
  field: string;
  constraints: string[];
}

/**
 * Implémentation simulée de `/users/me`.
 *
 * Elle imite volontairement le comportement du back décrit dans `docs/API.md` :
 * modifications persistées, validation avant écriture, champs non autorisés
 * refusés (`forbidNonWhitelisted` côté NestJS) et erreurs au format du contrat.
 *
 * Les données vivent dans le `localStorage` et survivent donc à un rechargement
 * de page, ce qu'exige le critère de validation de l'US-047.
 */
@Injectable()
export class UsersMockService extends UsersService {
  private readonly storage = inject(BROWSER_STORAGE);
  private readonly session = inject(MockSession);

  override getMe(): Observable<UserProfile> {
    // Après une déconnexion, plus aucun compte n'est rattaché à cet appareil.
    const user = this.session.isOpen
      ? this.readUsers().find((candidate) => candidate.id === CURRENT_USER_ID)
      : undefined;

    if (user === undefined) {
      return mockFail(
        401,
        'UNAUTHENTICATED',
        'Session invalide. Merci de te reconnecter.',
        undefined,
        PATH,
      );
    }

    return mockOk(user);
  }

  override updateMe(payload: UpdateProfileDraft): Observable<UserProfile> {
    const users = this.readUsers();
    const index = this.session.isOpen
      ? users.findIndex((candidate) => candidate.id === CURRENT_USER_ID)
      : -1;

    if (index === -1) {
      return mockFail(
        401,
        'UNAUTHENTICATED',
        'Session invalide. Merci de te reconnecter.',
        undefined,
        PATH,
      );
    }

    const details = validate(payload);
    if (details.length > 0) {
      // Aucune écriture : une requête invalide ne modifie rien.
      return mockFail(400, 'VALIDATION_ERROR', 'Certains champs sont invalides.', details, PATH);
    }

    const current = users[index];
    const updated: UserProfile = {
      ...current,
      ...(payload.firstName === undefined ? {} : { firstName: payload.firstName.trim() }),
      ...(payload.lastName === undefined ? {} : { lastName: payload.lastName.trim() }),
      ...(payload.phone === undefined ? {} : { phone: normalizeOptional(payload.phone) }),
      ...(payload.birthDate === undefined
        ? {}
        : { birthDate: normalizeOptional(payload.birthDate) }),
    };

    const next = [...users];
    next[index] = updated;
    this.writeUsers(next);

    return mockOk(updated);
  }

  private readUsers(): UserProfile[] {
    try {
      const raw = this.storage.getItem(STORAGE_KEY);
      if (raw !== null) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed as UserProfile[];
        }
      }
    } catch {
      // Stockage indisponible ou contenu corrompu : on repart des fixtures.
    }
    return mockUsers.map((user) => ({ ...user }));
  }

  private writeUsers(users: readonly UserProfile[]): void {
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(users));
    } catch {
      // Navigation privée ou quota atteint : la modification reste en mémoire.
    }
  }
}

/** Un champ facultatif effacé par l'utilisateur vaut `null`, pas une chaîne vide. */
function normalizeOptional(valeur: string | null): string | null {
  const nettoye = valeur?.trim() ?? '';
  return nettoye === '' ? null : nettoye;
}

/** Reproduit la validation du `ValidationPipe` du back, dans le format `details` du contrat. */
function validate(payload: UpdateProfileDraft): ValidationDetail[] {
  const details: ValidationDetail[] = [];
  const received = payload as Record<string, unknown>;
  const keys = Object.keys(received);

  // `minProperties: 1` dans le contrat.
  if (keys.length === 0) {
    details.push({ field: '', constraints: ['au moins un champ doit être fourni'] });
  }

  // `forbidNonWhitelisted` : une tentative de modifier l'email, le rôle ou
  // l'identifiant d'un autre compte est refusée, pas ignorée.
  for (const key of keys) {
    if (!(EDITABLE_PROFILE_FIELDS as readonly string[]).includes(key)) {
      details.push({ field: key, constraints: [`property ${key} should not exist`] });
    }
  }

  for (const field of ['firstName', 'lastName'] as const) {
    const value = received[field];
    if (value === undefined) {
      continue;
    }
    if (typeof value !== 'string') {
      details.push({ field, constraints: [`${field} must be a string`] });
      continue;
    }
    const trimmed = value.trim();
    if (trimmed.length < PROFILE_RULES[field].minLength) {
      details.push({ field, constraints: [`${field} should not be empty`] });
    } else if (trimmed.length > PROFILE_RULES[field].maxLength) {
      details.push({
        field,
        constraints: [
          `${field} must be shorter than or equal to ${PROFILE_RULES[field].maxLength} characters`,
        ],
      });
    }
  }

  const phone = received['phone'];
  if (phone !== undefined && phone !== null) {
    if (typeof phone !== 'string') {
      details.push({ field: 'phone', constraints: ['phone must be a string'] });
    } else if (phone.trim() !== '' && !PROFILE_RULES.phone.pattern.test(phone.trim())) {
      details.push({
        field: 'phone',
        constraints: ['phone must match /^0[1-9]\\d{8}$/ regular expression'],
      });
    }
  }

  const birthDate = received['birthDate'];
  if (birthDate !== undefined && birthDate !== null && birthDate !== '') {
    if (typeof birthDate !== 'string' || !PROFILE_RULES.birthDate.pattern.test(birthDate)) {
      details.push({
        field: 'birthDate',
        constraints: ['birthDate must be a valid ISO 8601 date'],
      });
    } else {
      const date = new Date(`${birthDate}T00:00:00.000Z`);
      if (Number.isNaN(date.getTime())) {
        details.push({ field: 'birthDate', constraints: ['birthDate must be a valid date'] });
      } else if (date.getTime() > Date.now()) {
        details.push({ field: 'birthDate', constraints: ['birthDate must not be in the future'] });
      }
    }
  }

  return details;
}

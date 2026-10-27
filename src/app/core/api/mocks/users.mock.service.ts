import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { BROWSER_STORAGE } from '../../storage/browser-storage';
import type { UpdateProfileRequest, User } from '../api.types';
import { EDITABLE_PROFILE_FIELDS, PROFILE_RULES } from '../profile-rules';
import { UsersService } from '../users.service';

import { MOCK_CUSTOMER_ID, mockUsers } from './fixtures/users.fixture';
import { mockFail, mockOk } from './mock-delay';

const STORAGE_KEY = 'brume.mock.users';
const PATH = '/api/users/me';

/**
 * Identifiant du compte considéré comme connecté tant que la connexion
 * (US-045 / US-046) n'est pas implémentée. Le vrai back déduit cet
 * identifiant du jeton : le front ne l'envoie jamais.
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

  override getMe(): Observable<User> {
    const user = this.readUsers().find((candidate) => candidate.id === CURRENT_USER_ID);

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

  override updateMe(payload: UpdateProfileRequest): Observable<User> {
    const users = this.readUsers();
    const index = users.findIndex((candidate) => candidate.id === CURRENT_USER_ID);

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
    const updated: User = {
      ...current,
      ...(payload.firstName === undefined ? {} : { firstName: payload.firstName.trim() }),
      ...(payload.lastName === undefined ? {} : { lastName: payload.lastName.trim() }),
      ...(payload.phone === undefined ? {} : { phone: normalizePhone(payload.phone) }),
    };

    const next = [...users];
    next[index] = updated;
    this.writeUsers(next);

    return mockOk(updated);
  }

  private readUsers(): User[] {
    try {
      const raw = this.storage.getItem(STORAGE_KEY);
      if (raw !== null) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed as User[];
        }
      }
    } catch {
      // Stockage indisponible ou contenu corrompu : on repart des fixtures.
    }
    return mockUsers.map((user) => ({ ...user }));
  }

  private writeUsers(users: readonly User[]): void {
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(users));
    } catch {
      // Navigation privée ou quota atteint : la modification reste en mémoire.
    }
  }
}

function normalizePhone(phone: string | null): string | null {
  const trimmed = phone?.trim() ?? '';
  return trimmed === '' ? null : trimmed;
}

/** Reproduit la validation du `ValidationPipe` du back, dans le format `details` du contrat. */
function validate(payload: UpdateProfileRequest): ValidationDetail[] {
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

  return details;
}

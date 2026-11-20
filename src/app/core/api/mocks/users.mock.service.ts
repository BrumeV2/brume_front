import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { BROWSER_STORAGE } from '../../storage/browser-storage';
import type { UpdateProfileDraft, UserProfile } from '../api.types';
import { EDITABLE_PROFILE_FIELDS, PROFILE_RULES } from '../profile-rules';
import { UsersService } from '../users.service';

import { mockUsers } from './fixtures/users.fixture';
import { mockFail, mockOk } from './mock-delay';
import { MockSession } from './mock-session';

const STORAGE_KEY = 'brume.mock.users';
const PATH = '/api/users/me';

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
      ? this.readUsers().find((candidate) => candidate.id === this.session.userId)
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
      ? users.findIndex((candidate) => candidate.id === this.session.userId)
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
      ...(payload.address === undefined ? {} : { address: normalizeOptional(payload.address) }),
      ...(payload.postalCode === undefined
        ? {}
        : { postalCode: normalizeOptional(payload.postalCode) }),
      ...(payload.city === undefined ? {} : { city: normalizeOptional(payload.city) }),
      ...(payload.doNewsletter === undefined ? {} : { doNewsletter: payload.doNewsletter }),
      updatedAt: new Date().toISOString(),
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

  // Les champs facultatifs : `null` les efface, une valeur doit rester valide.
  for (const field of ['phone', 'postalCode'] as const) {
    const value = received[field];
    if (value === undefined || value === null) {
      continue;
    }
    if (typeof value !== 'string') {
      details.push({ field, constraints: [`${field} must be a string`] });
    } else if (value.trim() !== '' && !PROFILE_RULES[field].pattern.test(value.trim())) {
      details.push({
        field,
        constraints: [
          `${field} must match ${String(PROFILE_RULES[field].pattern)} regular expression`,
        ],
      });
    }
  }

  const address = received['address'];
  if (address !== undefined && address !== null) {
    if (typeof address !== 'string') {
      details.push({ field: 'address', constraints: ['address must be a string'] });
    } else if (address.trim().length > PROFILE_RULES.address.maxLength) {
      details.push({
        field: 'address',
        constraints: [
          `address must be shorter than or equal to ${PROFILE_RULES.address.maxLength} characters`,
        ],
      });
    }
  }

  const city = received['city'];
  if (city !== undefined && city !== null) {
    if (typeof city !== 'string') {
      details.push({ field: 'city', constraints: ['city must be a string'] });
    } else if (city.trim().length > PROFILE_RULES.city.maxLength) {
      details.push({
        field: 'city',
        constraints: [
          `city must be shorter than or equal to ${PROFILE_RULES.city.maxLength} characters`,
        ],
      });
    }
  }

  const doNewsletter = received['doNewsletter'];
  if (doNewsletter !== undefined && typeof doNewsletter !== 'boolean') {
    details.push({ field: 'doNewsletter', constraints: ['doNewsletter must be a boolean value'] });
  }

  return details;
}

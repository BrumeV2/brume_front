import { FormControl } from '@angular/forms';
import { describe, expect, it } from 'vitest';
import { toApiError } from '../../core/api/api-error';
import { HttpErrorResponse } from '@angular/common/http';
import { authErrorMessage, passwordControl, strongPassword } from './auth-form';

describe('Règles de mot de passe', () => {
  it.each(['ValidPass1!', 'Été2026!', 'A1!aaaaa', 'A1!' + 'a'.repeat(125)])(
    'accepte %s',
    (value) => {
      const control = passwordControl(true);
      control.setValue(value);
      expect(control.valid).toBe(true);
    },
  );
  it.each(['', 'A1!aaaa', 'a1!aaaaa', 'Abcdefg!', 'Abcdefg1', 'A1 aaaaa', 'A1!' + 'a'.repeat(126)])(
    'refuse une valeur invalide (%j)',
    (value) => {
      const control = passwordControl(true);
      control.setValue(value);
      expect(control.invalid).toBe(true);
    },
  );
  it('ne renforce pas rétroactivement les mots de passe de connexion', () => {
    const control = passwordControl(false);
    control.setValue('legacy');
    expect(control.valid).toBe(true);
    expect(strongPassword(new FormControl('A1!aaaaa'))).toBeNull();
  });
});
describe('Messages de connexion fondés sur le code', () => {
  it.each([
    ['INVALID_CREDENTIALS', 'Email ou mot de passe incorrect'],
    ['EMAIL_NOT_CONFIRMED', 'Confirme ton adresse email'],
    ['ACCOUNT_BLOCKED', 'bloqué'],
    ['INVALID_TOKEN', 'Lien invalide ou expiré'],
    ['ADMIN_REQUIRED', 'Accès refusé'],
    ['UNAUTHENTICATED', 'session a expiré'],
    ['CSRF_INVALID', 'vérifiée'],
  ])('traite %s sans interpréter le message serveur', (code, expected) => {
    const error = toApiError(
      new HttpErrorResponse({
        status: 403,
        error: { statusCode: 403, code, message: 'Autre texte' },
      }),
    );
    expect(authErrorMessage(error)).toContain(expected);
  });
  it('annonce une indisponibilité temporaire sur 503', () => {
    expect(authErrorMessage(toApiError(new HttpErrorResponse({ status: 503 })))).toContain(
      'temporairement indisponible',
    );
  });
});

import {
  FormControl,
  Validators,
  type AbstractControl,
  type ValidationErrors,
} from '@angular/forms';
import type { ApiError } from '../../core/api/api-error';

export const PASSWORD_HELP =
  'De 8 à 128 caractères, avec au moins une majuscule, un chiffre et un caractère spécial.';
export const EMAIL_ACCEPTED =
  'Si cette adresse peut recevoir cet email, un message lui sera envoyé. Consulte ta boîte de réception et tes courriers indésirables.';
export const INVALID_LINK = 'Lien invalide ou expiré';

export function emailControl(): FormControl<string> {
  return new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.email, Validators.maxLength(254)],
  });
}
export function passwordControl(strong: boolean): FormControl<string> {
  return new FormControl('', {
    nonNullable: true,
    validators: [
      Validators.required,
      Validators.maxLength(128),
      ...(strong ? [Validators.minLength(8), strongPassword] : []),
    ],
  });
}
export function strongPassword(control: AbstractControl): ValidationErrors | null {
  return /^(?=[\s\S]*\p{Lu})(?=[\s\S]*[0-9])(?=[\s\S]*[\p{P}\p{S}])/u.test(String(control.value))
    ? null
    : { passwordStrength: true };
}
export function fieldError(
  control: FormControl<string>,
  field: 'email' | 'password',
  error: ApiError | null,
): string | null {
  if (error?.fieldErrors[field])
    return field === 'email' ? 'Vérifie ton adresse email.' : PASSWORD_HELP;
  if (!control.touched || !control.invalid) return null;
  if (control.hasError('required'))
    return field === 'email' ? 'Renseigne ton adresse email.' : 'Renseigne ton mot de passe.';
  return field === 'email'
    ? 'Renseigne une adresse email valide (254 caractères maximum).'
    : PASSWORD_HELP;
}
export function authErrorMessage(error: ApiError): string {
  if (error.statusCode === 503)
    return 'Le service est temporairement indisponible. Réessaie dans un instant.';
  switch (error.code) {
    case 'INVALID_CREDENTIALS':
      return 'Email ou mot de passe incorrect';
    case 'EMAIL_NOT_CONFIRMED':
      return 'Confirme ton adresse email avant de te connecter.';
    case 'ACCOUNT_BLOCKED':
      return 'Ton compte est bloqué. Contacte le support.';
    case 'UNAUTHENTICATED':
      return 'Ta session a expiré. Connecte-toi de nouveau.';
    case 'INVALID_TOKEN':
      return INVALID_LINK;
    case 'ADMIN_REQUIRED':
      return 'Accès refusé.';
    case 'CSRF_INVALID':
      return 'La requête n’a pas pu être vérifiée. Recharge la page et réessaie.';
    case 'VALIDATION_ERROR':
      return 'Vérifie les champs du formulaire.';
    default:
      return error.message;
  }
}

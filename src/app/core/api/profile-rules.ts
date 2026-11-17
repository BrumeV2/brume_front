/**
 * Contraintes du profil, telles que `UpdateProfileRequest` les déclare dans
 * `openapi.yaml` (branche `develop` de brume_back).
 *
 * Un seul endroit à corriger quand le contrat change. Utilisées par le
 * formulaire et par la validation du mock, qui rejouent ici la validation du
 * `ValidationPipe` du back pour que l'écran refuse ce que l'API refuserait.
 *
 * Les champs facultatifs sont `nullable` : un champ vidé part à `null`, jamais
 * en chaîne vide.
 */
export const PROFILE_RULES = {
  firstName: { minLength: 1, maxLength: 100 },
  lastName: { minLength: 1, maxLength: 100 },
  /** Numéro français à 10 chiffres : `^0[1-9]\d{8}$`. Facultatif. */
  phone: { pattern: /^0[1-9]\d{8}$/ },
  /** Rue et numéro, sur une seule ligne au contrat. Facultative. */
  address: { maxLength: 255 },
  /** Code postal à 5 chiffres : `^\d{5}$`. Facultatif. */
  postalCode: { pattern: /^\d{5}$/ },
  city: { minLength: 1, maxLength: 100 },
} as const;

/** Champs que l'API accepte en modification. Tout le reste est refusé. */
export const EDITABLE_PROFILE_FIELDS = [
  'firstName',
  'lastName',
  'phone',
  'address',
  'postalCode',
  'city',
  'doNewsletter',
] as const;

export type EditableProfileField = (typeof EDITABLE_PROFILE_FIELDS)[number];

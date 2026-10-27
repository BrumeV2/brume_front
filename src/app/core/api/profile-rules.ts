/**
 * Contraintes du profil.
 *
 * `firstName`, `lastName` et `phone` viennent de `UpdateProfileRequest` dans
 * `openapi.yaml`. `birthDate` n'existe pas encore dans le contrat (voir la note
 * « HORS CONTRAT » dans `api.types.ts`) : sa règle est celle de la maquette,
 * à confirmer avec le back.
 *
 * Un seul endroit à corriger quand le contrat change. Utilisées par le
 * formulaire et par la validation du mock.
 */
export const PROFILE_RULES = {
  firstName: { minLength: 1, maxLength: 100 },
  lastName: { minLength: 1, maxLength: 100 },
  /** Numéro français à 10 chiffres : `^0[1-9]\d{8}$`. Facultatif. */
  phone: { pattern: /^0[1-9]\d{8}$/ },
  /** Date ISO `YYYY-MM-DD`. Facultative, et jamais dans le futur. */
  birthDate: { pattern: /^\d{4}-\d{2}-\d{2}$/ },
} as const;

/** Champs que l'API accepte en modification. Tout le reste est refusé. */
export const EDITABLE_PROFILE_FIELDS = ['firstName', 'lastName', 'phone', 'birthDate'] as const;

export type EditableProfileField = (typeof EDITABLE_PROFILE_FIELDS)[number];

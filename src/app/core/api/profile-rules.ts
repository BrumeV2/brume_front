/**
 * Contraintes du profil, reprises telles quelles de `UpdateProfileRequest`
 * dans `openapi.yaml`. Un seul endroit à corriger si le contrat change.
 *
 * Utilisées par le formulaire (validation côté client) et par le mock
 * (validation côté « serveur » simulé).
 */
export const PROFILE_RULES = {
  firstName: { minLength: 1, maxLength: 100 },
  lastName: { minLength: 1, maxLength: 100 },
  /** Numéro français à 10 chiffres : `^0[1-9]\d{8}$`. Facultatif. */
  phone: { pattern: /^0[1-9]\d{8}$/ },
} as const;

/** Champs que l'API accepte en modification. Tout le reste est refusé. */
export const EDITABLE_PROFILE_FIELDS = ['firstName', 'lastName', 'phone'] as const;

export type EditableProfileField = (typeof EDITABLE_PROFILE_FIELDS)[number];

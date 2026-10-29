/**
 * Alias lisibles des types du contrat d'API.
 *
 * La source de vérité est `schema.d.ts`, généré depuis `openapi.yaml` de `brume_back` :
 *
 * ```bash
 * npx openapi-typescript@7 ../brume_back/docs/contract/openapi.yaml -o src/app/core/api/schema.d.ts
 * ```
 *
 * On n'écrit jamais un type d'API à la main : on l'extrait d'ici.
 */
import type { components } from './schema';

export type User = components['schemas']['User'];
export type Role = components['schemas']['Role'];
export type UpdateProfileRequest = components['schemas']['UpdateProfileRequest'];
export type Address = components['schemas']['Address'];
export type AddressInput = components['schemas']['AddressInput'];
export type PageMeta = components['schemas']['PageMeta'];

/* ─────────────────────────────────────────────────────────────────────────
 * HORS CONTRAT — champs présents dans la maquette mais absents de
 * `openapi.yaml` (branche `develop` de brume_back) au 27/10/2026.
 *
 * La connexion passe par Google, seul fournisseur d'identité.
 * L'email et la photo viennent du fournisseur et ne se modifient pas depuis
 * Brume ; le prénom et le nom en viennent aussi mais restent corrigeables,
 * puisqu'ils servent de destinataire des colis (écran « Profil client — mobile »).
 *
 * Seule la date de naissance est propre à Brume et absente du contrat.
 *
 * À faire ajouter au contrat côté back. Tant que ce n'est pas fait, seule
 * l'implémentation simulée connaît ces champs.
 * ───────────────────────────────────────────────────────────────────────── */

export interface ProfileExtensions {
  /** Date de naissance au format `YYYY-MM-DD`. Facultative (majorité CBD, D-002). */
  birthDate: string | null;
  /** Photo de profil fournie par le fournisseur d'identité. */
  avatarUrl: string | null;
}

/** Profil tel que l'écran « Mon profil » l'affiche. */
export type UserProfile = User & ProfileExtensions;

/** Corps d'une modification de profil : champs du contrat + extensions. */
export type UpdateProfileDraft = UpdateProfileRequest &
  Partial<Omit<ProfileExtensions, 'avatarUrl'>>;

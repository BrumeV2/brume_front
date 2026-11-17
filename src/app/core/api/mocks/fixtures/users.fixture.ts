/**
 * Comptes de test, dérivés de `docs/contract/seed.json` de `brume_back` :
 * mêmes identifiants, mêmes emails, mêmes noms, pour que le passage au vrai
 * back ne change aucune donnée visible.
 *
 * L'adresse de Camille reprend celle du seed, que le back a aplatie dans le
 * profil (migration `ReplaceAddressesWithProfiles`) : une seule adresse par
 * client, en trois champs.
 *
 * `avatarUrl` ne vient pas du seed : la photo du compte Google n'est pas au
 * contrat (voir la note « HORS CONTRAT » dans `api.types.ts`). Laissée à
 * `null`, l'écran retombe sur les initiales.
 *
 * Les mots de passe du seed ne sont volontairement pas repris ici : rien de
 * secret ne doit se retrouver dans le bundle du front.
 */
import type { UserProfile } from '../../api.types';

export const MOCK_CUSTOMER_ID = 'e0000000-0000-4000-8000-000000000001';
export const MOCK_ADMIN_ID = 'e0000000-0000-4000-8000-000000000002';

export const mockUsers: readonly UserProfile[] = [
  {
    id: MOCK_CUSTOMER_ID,
    userId: MOCK_CUSTOMER_ID,
    email: 'camille.martin@example.com',
    firstName: 'Camille',
    lastName: 'Martin',
    phone: '0612345678',
    address: '12 rue des Lilas',
    postalCode: '69003',
    city: 'Lyon',
    loyaltyPoints: 240,
    doNewsletter: true,
    role: 'CUSTOMER',
    status: 'ACTIVE',
    emailVerifiedAt: '2026-10-27T12:00:00.000Z',
    createdAt: '2025-03-12T09:12:00.000Z',
    updatedAt: '2026-10-27T12:00:00.000Z',
    avatarUrl: null,
  },
  {
    id: MOCK_ADMIN_ID,
    userId: MOCK_ADMIN_ID,
    email: 'admin@brume.dev',
    firstName: 'Admin',
    lastName: 'Brume',
    phone: null,
    address: null,
    postalCode: null,
    city: null,
    loyaltyPoints: 0,
    doNewsletter: false,
    role: 'ADMIN',
    status: 'ACTIVE',
    emailVerifiedAt: '2026-10-27T12:00:00.000Z',
    createdAt: '2026-01-10T08:00:00.000Z',
    updatedAt: '2026-01-10T08:00:00.000Z',
    avatarUrl: null,
  },
];

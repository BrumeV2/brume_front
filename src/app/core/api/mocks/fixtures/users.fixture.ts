/**
 * Comptes de test, dérivés de `docs/contract/seed.json` de `brume_back` :
 * mêmes identifiants, mêmes emails, mêmes noms, pour que le passage au vrai
 * back ne change aucune donnée visible.
 *
 * `birthDate` et `avatarUrl` ne viennent pas du seed : ils
 * n'existent pas encore dans le contrat (voir la note « HORS CONTRAT » dans
 * `api.types.ts`). Les valeurs reprennent celles de la maquette.
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
    email: 'camille.martin@example.com',
    firstName: 'Camille',
    lastName: 'Martin',
    phone: '0612345678',
    role: 'CUSTOMER',
    createdAt: '2025-03-12T09:12:00.000Z',
    birthDate: '1996-05-14',
    avatarUrl: null,
  },
  {
    id: MOCK_ADMIN_ID,
    email: 'admin@brume.dev',
    firstName: 'Admin',
    lastName: 'Brume',
    phone: null,
    role: 'ADMIN',
    createdAt: '2026-01-10T08:00:00.000Z',
    birthDate: null,
    avatarUrl: null,
  },
];

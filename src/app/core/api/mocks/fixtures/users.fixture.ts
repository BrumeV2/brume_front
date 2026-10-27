/**
 * Comptes de test, dérivés de `docs/contract/seed.json` de `brume_back` :
 * mêmes identifiants, mêmes emails, mêmes noms, pour que le passage au vrai
 * back ne change aucune donnée visible.
 *
 * Les mots de passe du seed ne sont volontairement pas repris ici : rien de
 * secret ne doit se retrouver dans le bundle du front.
 */
import type { User } from '../../api.types';

export const MOCK_CUSTOMER_ID = 'e0000000-0000-4000-8000-000000000001';
export const MOCK_ADMIN_ID = 'e0000000-0000-4000-8000-000000000002';

export const mockUsers: readonly User[] = [
  {
    id: MOCK_CUSTOMER_ID,
    email: 'camille.martin@example.com',
    firstName: 'Camille',
    lastName: 'Martin',
    phone: '0612345678',
    role: 'CUSTOMER',
    createdAt: '2026-01-15T09:12:00.000Z',
  },
  {
    id: MOCK_ADMIN_ID,
    email: 'admin@brume.dev',
    firstName: 'Admin',
    lastName: 'Brume',
    phone: null,
    role: 'ADMIN',
    createdAt: '2026-01-10T08:00:00.000Z',
  },
];

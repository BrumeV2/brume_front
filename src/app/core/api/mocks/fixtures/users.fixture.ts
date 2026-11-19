/**
 * Comptes de test, dérivés de `docs/contract/seed.json` de `brume_back` :
 * mêmes identifiants, mêmes emails, pour que le passage au vrai back ne change
 * aucune donnée visible.
 *
 * **Le profil est vide**, hors l'email : c'est l'état d'un compte qui vient
 * d'être créé, et c'est ce que montrera le branchement sur le vrai back. Un
 * écran prérempli de données inventées donnerait une fausse idée de ce qu'il
 * reste à faire, et laisserait passer les bogues du cas « rien de rempli ».
 * Les tests qui ont besoin d'un profil complet le composent eux-mêmes.
 *
 * `avatarUrl` ne vient pas du seed et n'est pas au contrat (voir la note
 * « HORS CONTRAT » dans `api.types.ts`) : à `null`, l'écran retombe sur les
 * initiales, puis sur l'email.
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
    firstName: null,
    lastName: null,
    phone: null,
    address: null,
    postalCode: null,
    city: null,
    loyaltyPoints: 0,
    doNewsletter: false,
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
    firstName: null,
    lastName: null,
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

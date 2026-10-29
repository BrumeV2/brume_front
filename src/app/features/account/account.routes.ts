import { Routes } from '@angular/router';

import { authGuard } from '../../core/auth/auth.guards';

export const accountRoutes: Routes = [
  {
    // Point d'arrivée du parcours Google (AUTH_SUCCESS_URL côté API) : le
    // chemin `/compte` doit rester servi par cette page.
    path: '',
    title: 'Mon compte — Brume',
    canActivate: [authGuard],
    loadComponent: () => import('../compte/compte').then((m) => m.Compte),
  },
  {
    // Pas de `authGuard` ici tant que `useMocks` est à `true` : la garde
    // interroge la vraie API, qui n'existe pas encore, et renverrait vers
    // /connexion un écran dont la story demande qu'il soit démontrable.
    // À ajouter en même temps que le branchement du back.
    path: 'profil',
    title: 'Mon profil — Brume',
    loadComponent: () => import('./pages/profile/profile').then((m) => m.Profile),
  },
];

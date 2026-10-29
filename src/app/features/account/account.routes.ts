import { Routes } from '@angular/router';

import { authGuard } from '../../core/auth/auth.guards';

// Toutes les pages du compte exigent une session. La garde passe par
// `UsersService` : elle fonctionne aussi en mode simulé (`useMocks`).
export const accountRoutes: Routes = [
  {
    // Point d'arrivée du parcours Google (AUTH_SUCCESS_URL côté API) : le
    // chemin `/compte` doit rester servi par cette page.
    path: '',
    title: 'Mon compte — Brume',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/account-home/account-home').then((m) => m.AccountHome),
  },
  {
    path: 'profil',
    title: 'Mon profil — Brume',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/profile/profile').then((m) => m.Profile),
  },
];

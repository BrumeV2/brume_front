import { Routes } from '@angular/router';

import { guestGuard } from './core/auth/auth.guards';

export const routes: Routes = [
  // Pas encore de page d'accueil : la connexion sert d'entrée.
  { path: '', pathMatch: 'full', redirectTo: 'connexion' },
  {
    path: 'connexion',
    title: 'Connexion — Brume',
    canActivate: [guestGuard],
    data: { menu: 'transparent', piedDePage: false },
    loadComponent: () => import('./features/auth/connexion/connexion').then((m) => m.Connexion),
  },
  {
    path: 'inscription',
    title: 'Inscription — Brume',
    canActivate: [guestGuard],
    data: { piedDePage: false },
    loadComponent: () =>
      import('./features/auth/inscription/inscription').then((m) => m.Inscription),
  },
  {
    path: 'compte',
    // Bandeau sombre en haut de chaque page du compte : le menu se pose dessus.
    data: { menu: 'transparent' },
    loadChildren: () => import('./features/account/account.routes').then((m) => m.accountRoutes),
  },
  // Toujours en dernier : une route placée après ce joker serait inatteignable.
  {
    path: '**',
    title: 'Page introuvable — Brume',
    loadComponent: () => import('./features/not-found/not-found').then((m) => m.NotFound),
  },
];

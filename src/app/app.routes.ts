import { Routes } from '@angular/router';

import { guestGuard } from './core/auth/auth.guards';

export const routes: Routes = [
  // Pas encore de page d'accueil : la connexion sert d'entrée.
  { path: '', pathMatch: 'full', redirectTo: 'connexion' },
  {
    path: 'connexion',
    title: 'Connexion — Brume',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/connexion/connexion').then((m) => m.Connexion),
  },
  {
    path: 'inscription',
    title: 'Inscription — Brume',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/inscription/inscription').then((m) => m.Inscription),
  },
  {
    path: 'boutique',
    loadChildren: () => import('./features/catalog/catalog.routes').then((m) => m.catalogRoutes),
  },
  {
    path: 'compte',
    loadChildren: () => import('./features/account/account.routes').then((m) => m.accountRoutes),
  },
  // Toujours en dernier : une route placée après ce joker serait inatteignable.
  // Cible `connexion` et non `''` : Angular n'enchaîne pas la redirection du
  // joker avec celle de la route vide, et l'URL inconnue resterait sur une page
  // blanche (vérifié dans le navigateur).
  { path: '**', redirectTo: 'connexion' },
];

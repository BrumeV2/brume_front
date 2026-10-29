import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/auth.guards';

export const routes: Routes = [
  { path: '', redirectTo: 'compte/profil', pathMatch: 'full' },
  {
    path: 'compte',
    loadChildren: () => import('./features/account/account.routes').then((m) => m.accountRoutes),
  },
  { path: '**', redirectTo: 'compte/profil' },
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
    path: 'compte',
    title: 'Mon compte — Brume',
    canActivate: [authGuard],
    loadComponent: () => import('./features/compte/compte').then((m) => m.Compte),
  },
  { path: '**', redirectTo: '' },
];

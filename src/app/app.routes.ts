import { Routes } from '@angular/router';

import { guestGuard } from './core/auth/auth.guards';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Brume, thé, café & CBD à Paris',
    // La vidéo du haut de page passe sous le menu.
    data: { menu: 'transparent' },
    loadComponent: () => import('./features/home/pages/home/home').then((m) => m.Home),
  },
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

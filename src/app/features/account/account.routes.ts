import { Routes } from '@angular/router';

export const accountRoutes: Routes = [
  { path: '', redirectTo: 'profil', pathMatch: 'full' },
  {
    path: 'profil',
    title: 'Mon profil · Brume',
    loadComponent: () => import('./pages/profile/profile').then((m) => m.Profile),
  },
];

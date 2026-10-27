import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'compte/profil', pathMatch: 'full' },
  {
    path: 'compte',
    loadChildren: () => import('./features/account/account.routes').then((m) => m.accountRoutes),
  },
  { path: '**', redirectTo: 'compte/profil' },
];

import { Routes } from '@angular/router';

import { authGuard } from '../../core/auth/auth.guards';

// D-013 : un compte est obligatoire pour commander.
export const checkoutRoutes: Routes = [
  {
    path: '',
    title: 'Commande — Brume',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/checkout/checkout').then((m) => m.Checkout),
  },
];

import { Routes } from '@angular/router';

export const catalogRoutes: Routes = [
  {
    path: '',
    title: 'La boutique — Brume',
    loadComponent: () => import('./pages/product-list/product-list').then((m) => m.ProductList),
  },
];

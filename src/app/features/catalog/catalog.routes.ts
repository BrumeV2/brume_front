import { Routes } from '@angular/router';

export const catalogRoutes: Routes = [
  {
    path: '',
    title: 'La boutique — Brume',
    loadComponent: () => import('./pages/product-list/product-list').then((m) => m.ProductList),
  },
  {
    // Après `''`, et avant rien : un slug ne peut pas masquer une route fixe.
    path: ':slug',
    // Repli : l'écran remplace ce titre par le nom du produit une fois chargé.
    title: 'Produit — Brume',
    loadComponent: () =>
      import('./pages/product-detail/product-detail').then((m) => m.ProductDetail),
  },
];

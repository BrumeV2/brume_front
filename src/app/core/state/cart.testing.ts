import type { Provider } from '@angular/core';

import { CartService } from '../api/cart.service';
import { CartMockService } from '../api/mocks/cart.mock.service';
import { SessionMockService } from '../api/mocks/session.mock.service';
import { SessionService } from '../api/session.service';
import { BROWSER_STORAGE, InMemoryStorage } from '../storage/browser-storage';

/**
 * Panier simulé pour les tests d'un écran qui affiche le menu ou la fiche
 * produit : `CartStore` y est injecté partout. Le stockage est en mémoire,
 * neuf à chaque test, pour qu'aucun panier ne fuie d'un test à l'autre.
 *
 * `ProductsService` et `UsersService` restent à fournir par le test : c'est
 * lui qui décide si le client est connecté et ce que le catalogue contient.
 */
export function provideCartForTests(): Provider[] {
  return [
    { provide: CartService, useClass: CartMockService },
    // Le panier suit la session, via `AuthService`.
    { provide: SessionService, useClass: SessionMockService },
    { provide: BROWSER_STORAGE, useFactory: () => new InMemoryStorage() },
  ];
}

import { Injectable } from '@angular/core';

import { MOCK_CUSTOMER_ID } from './fixtures/users.fixture';

/**
 * Session simulée de l'appareil, partagée par les mocks.
 *
 * Ouverte au démarrage de l'application (le compte de test est « connecté »),
 * fermée par une déconnexion. Volontairement en mémoire seulement : il n'existe
 * pas de parcours Google simulé, donc recharger la page est la seule façon de
 * se « reconnecter » en démonstration.
 *
 * Elle porte aussi l'identifiant du compte connecté, que le vrai back lit dans
 * le cookie de session : les mocks rattachent leurs données à ce compte (un
 * panier par client), et les tests peuvent changer de compte avec `openAs()`.
 */
@Injectable({ providedIn: 'root' })
export class MockSession {
  private open = true;
  private currentUserId = MOCK_CUSTOMER_ID;

  get isOpen(): boolean {
    return this.open;
  }

  /** Compte rattaché à la session, `null` une fois déconnecté. */
  get userId(): string | null {
    return this.open ? this.currentUserId : null;
  }

  /** Ouvre la session au nom d'un autre compte. */
  openAs(userId: string): void {
    this.currentUserId = userId;
    this.open = true;
  }

  close(): void {
    this.open = false;
  }
}

import { Injectable } from '@angular/core';

/**
 * Session simulée de l'appareil, partagée par les mocks.
 *
 * Ouverte au démarrage de l'application (le compte de test est « connecté »),
 * fermée par une déconnexion. Volontairement en mémoire seulement : il n'existe
 * pas de parcours Google simulé, donc recharger la page est la seule façon de
 * se « reconnecter » en démonstration.
 */
@Injectable({ providedIn: 'root' })
export class MockSession {
  private open = true;

  get isOpen(): boolean {
    return this.open;
  }

  close(): void {
    this.open = false;
  }
}

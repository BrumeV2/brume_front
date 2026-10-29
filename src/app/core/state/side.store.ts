import { Injectable, inject, signal } from '@angular/core';

import { SESSION_STORAGE } from '../storage/browser-storage';

/** Côté mis en avant par la boutique. `null` : thé et café à égalité. */
export type Side = 'the' | 'cafe';

const CLE_COTE = 'brume.cote';
const CLE_INTRO = 'brume.intro-vue';

/**
 * Préférence « plutôt thé ou plutôt café » (interrupteur du menu et écran d'intro).
 *
 * Gardée pour la session, comme dans la maquette : une nouvelle visite repart
 * de la version neutre et rejoue l'intro.
 */
@Injectable({ providedIn: 'root' })
export class SideStore {
  private readonly storage = inject(SESSION_STORAGE);

  private readonly sideSignal = signal<Side | null>(this.lireCote());
  private readonly introSeenSignal = signal(this.lire(CLE_INTRO) === '1');

  readonly side = this.sideSignal.asReadonly();
  readonly introSeen = this.introSeenSignal.asReadonly();

  choose(side: Side | null): void {
    this.sideSignal.set(side);
    this.ecrire(CLE_COTE, side);
  }

  /** Re-cliquer sur le côté déjà choisi revient à la version neutre. */
  toggle(side: Side): void {
    this.choose(this.sideSignal() === side ? null : side);
  }

  markIntroSeen(): void {
    this.introSeenSignal.set(true);
    this.ecrire(CLE_INTRO, '1');
  }

  private lireCote(): Side | null {
    const valeur = this.lire(CLE_COTE);
    return valeur === 'the' || valeur === 'cafe' ? valeur : null;
  }

  private lire(cle: string): string | null {
    try {
      return this.storage.getItem(cle);
    } catch {
      return null;
    }
  }

  private ecrire(cle: string, valeur: string | null): void {
    try {
      if (valeur === null) this.storage.removeItem(cle);
      else this.storage.setItem(cle, valeur);
    } catch {
      // Navigation privée stricte : le choix vaut pour la page en cours seulement.
    }
  }
}

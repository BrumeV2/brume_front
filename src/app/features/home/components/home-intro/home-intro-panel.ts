import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import type { Side } from '../../../../core/state/side.store';

/**
 * Un volet de l'écran d'intro (thé ou café). L'hôte est le `<button>` lui-même :
 * `<button app-intro-panel side="the" …>`. Les transformations viennent de
 * `HomeIntro`, qui orchestre les deux volets ensemble.
 */
@Component({
  selector: 'button[app-intro-panel]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home-intro-panel.html',
  styleUrl: './home-intro-panel.scss',
  host: {
    type: 'button',
    '[attr.data-cote]': 'side()',
    '[class.devant]': 'devant()',
    '[class.chaud]': 'chaud()',
    '[class.froid]': 'froid()',
    '[class.choix-fait]': 'choixFait()',
    '[class.en-balayage]': 'balayage()',
  },
})
export class HomeIntroPanel {
  readonly side = input.required<Side>();
  readonly transformVolet = input.required<string>();
  readonly transformContenu = input.required<string>();
  /** Le côté choisi passe au premier plan. */
  readonly devant = input(false);
  /** Côté survolé : il s'agrandit. */
  readonly chaud = input(false);
  /** L'autre côté pendant un survol : il s'assombrit. */
  readonly froid = input(false);
  readonly choixFait = input(false);
  readonly balayage = input(false);

  /** Survol à la souris uniquement (pas au doigt) : `null` quand le pointeur sort. */
  readonly survol = output<Side | null>();

  protected entrer(evenement: PointerEvent): void {
    if (evenement.pointerType === 'mouse') this.survol.emit(this.side());
  }

  protected sortir(evenement: PointerEvent): void {
    if (evenement.pointerType === 'mouse') this.survol.emit(null);
  }
}

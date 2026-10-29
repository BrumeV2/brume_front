import { ApplicationRef, ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { Side, SideStore } from '../../core/state/side.store';
import { avecTransitionDeVue } from '../../shared/utils/view-transition';

const MESSAGES: Record<Side | 'neutre', string> = {
  the: 'Côté thé : la boutique met le thé en avant',
  cafe: 'Côté café : la boutique met le café en avant',
  neutre: 'Thé et café à égalité',
};

/**
 * « Interrupteur Thé · Café » du menu. Re-cliquer sur le côté choisi revient à
 * la version neutre. Sur l'accueil, le changement passe par un fondu (maquette
 * HTML) ; un message confirme le choix, visible et annoncé aux lecteurs d'écran.
 */
@Component({
  selector: 'app-side-switch',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './side-switch.html',
  styleUrl: './side-switch.scss',
})
export class SideSwitch {
  private readonly store = inject(SideStore);
  private readonly router = inject(Router);
  private readonly appRef = inject(ApplicationRef);

  protected readonly side = this.store.side;
  protected readonly message = signal('');
  private minuteur?: ReturnType<typeof setTimeout>;

  protected basculer(side: Side): void {
    const changer = () => this.store.toggle(side);

    if (this.router.url.split(/[?#]/)[0] === '/') {
      void avecTransitionDeVue('transition-fondu', changer, () => this.appRef.tick());
    } else {
      changer();
    }

    this.message.set(MESSAGES[this.side() ?? 'neutre']);
    clearTimeout(this.minuteur);
    this.minuteur = setTimeout(() => this.message.set(''), 2600);
  }
}

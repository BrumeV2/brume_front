import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

import { UiChip } from '../../../../shared/ui/ui-chip/ui-chip';
import type { OptionFiltre } from '../../catalog.types';

/**
 * Pastille « Type ⌄ » de la barre de filtres : un bouton qui ouvre la liste de
 * ses valeurs. Prend l'état actif de la pastille dès qu'une valeur est choisie,
 * et affiche alors cette valeur plutôt que le nom du filtre.
 *
 * Présentationnel : il ne connaît ni l'API ni l'URL, il annonce seulement ce
 * que l'utilisateur a choisi.
 */
@Component({
  selector: 'app-filter-menu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UiChip],
  templateUrl: './filter-menu.html',
  styleUrl: './filter-menu.scss',
  host: {
    '(document:click)': 'fermerSiDehors($event)',
    '(keydown.escape)': 'fermer()',
  },
})
export class FilterMenu {
  private readonly hote = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly nom = input.required<string>();
  readonly options = input.required<readonly OptionFiltre[]>();
  /** Valeur choisie, ou `null` quand le filtre n'est pas posé. */
  readonly valeur = input<string | null>(null);

  /** `null` = l'utilisateur retire le filtre. */
  readonly choix = output<string | null>();

  protected readonly ouvert = signal(false);

  protected libelle(): string {
    const choisie = this.options().find((option) => option.valeur === this.valeur());
    return choisie?.libelle ?? this.nom();
  }

  protected basculer(): void {
    this.ouvert.update((ouvert) => !ouvert);
  }

  protected fermer(): void {
    this.ouvert.set(false);
  }

  protected choisir(option: OptionFiltre): void {
    // Re-choisir la valeur déjà posée la retire : c'est le geste attendu d'une
    // pastille, et ça évite d'avoir à viser la croix de l'indicateur.
    this.choix.emit(option.valeur === this.valeur() ? null : option.valeur);
    this.fermer();
  }

  protected fermerSiDehors(evenement: Event): void {
    const cible = evenement.target;
    if (this.ouvert() && cible instanceof Node && !this.hote.nativeElement.contains(cible)) {
      this.fermer();
    }
  }
}

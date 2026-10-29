import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Pastille de la maquette (composant Figma « Pastille ») : filtres, choix, onglets.
 *
 * Le chevron est optionnel : il n'apparaît que sur une pastille qui ouvre un
 * menu, et se retourne tant que ce menu est ouvert.
 */
@Component({
  selector: 'app-ui-chip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ui-chip.html',
  styleUrl: './ui-chip.scss',
  host: {
    '[class.est-actif]': 'actif()',
    '[class.est-ouvert]': 'ouvert()',
  },
})
export class UiChip {
  readonly libelle = input.required<string>();
  readonly actif = input(false);
  /** Affiche le chevron des pastilles qui ouvrent un menu. */
  readonly chevron = input(false);
  /** Retourne le chevron tant que le menu est déplié. */
  readonly ouvert = input(false);
}

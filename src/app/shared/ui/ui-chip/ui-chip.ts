import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Pastille de la maquette (composant Figma « Pastille ») : filtres, choix, onglets.
 *
 * Rendue en lien quand `lien` est fourni, en bouton sinon.
 */
@Component({
  selector: 'app-ui-chip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ui-chip.html',
  styleUrl: './ui-chip.scss',
  host: { '[class.est-actif]': 'actif()' },
})
export class UiChip {
  readonly libelle = input.required<string>();
  readonly actif = input(false);
}

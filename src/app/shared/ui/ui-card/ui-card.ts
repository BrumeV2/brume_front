import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Carte de contenu de la maquette : fond papier, filet, coins arrondis. */
@Component({
  selector: 'app-ui-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ui-card.html',
  styleUrl: './ui-card.scss',
})
export class UiCard {
  readonly titre = input.required<string>();
  readonly description = input<string>();
}

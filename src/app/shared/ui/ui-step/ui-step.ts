import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** « Étape » de la maquette : un bloc numéroté de « Comment ça marche ». */
@Component({
  selector: 'app-ui-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ui-step.html',
  styleUrl: './ui-step.scss',
})
export class UiStep {
  /** Numéro affiché tel quel, ex. « 01 ». */
  readonly numero = input.required<string>();
  readonly titre = input.required<string>();
  readonly texte = input.required<string>();
  /** Photo facultative au-dessus du numéro (format 4:3). */
  readonly photo = input<string | null>(null);
}

import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

/**
 * Interrupteur de la maquette : un intitulé, sa ligne d'explication, et la
 * pastille qui bascule à droite.
 *
 * La maquette le dessine en vecteur ; il est refait en CSS parce qu'une image
 * ne se coche pas. Dessous, une vraie case à cocher : le clavier, les lecteurs
 * d'écran et les formulaires réactifs la connaissent déjà, `role="switch"` ne
 * faisant que renommer l'état « coché » en « activé ».
 */
@Component({
  selector: 'app-ui-switch',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  templateUrl: './ui-switch.html',
  styleUrl: './ui-switch.scss',
})
export class UiSwitch {
  readonly libelle = input.required<string>();
  readonly control = input.required<FormControl<boolean>>();
  readonly aide = input<string>();
}

import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Params, RouterLink } from '@angular/router';

/**
 * Bouton pilule de la maquette (composant Figma « Bouton »).
 *
 * - `plein` : action principale, fond encre
 * - `contour` : action secondaire
 * - `clair` : sur photo ou fond sombre
 *
 * Avec `lien`, il devient un lien de navigation à l'apparence de bouton.
 */
export type UiButtonVariant = 'plein' | 'contour' | 'clair';

@Component({
  selector: 'app-ui-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet, RouterLink],
  templateUrl: './ui-button.html',
  styleUrl: './ui-button.scss',
  host: { '[class]': '"variante-" + variante()' },
})
export class UiButton {
  readonly libelle = input.required<string>();
  readonly variante = input<UiButtonVariant>('plein');
  readonly type = input<'button' | 'submit'>('button');
  readonly fleche = input(false);
  readonly disabled = input(false);
  /** Remplace le libellé par un état d'attente et bloque le bouton. */
  readonly occupe = input(false);
  /** Route cible : rend un `<a routerLink>` au lieu d'un `<button>`. */
  readonly lien = input<string | null>(null);
  readonly params = input<Params | null>(null);

  readonly presse = output<void>();
}

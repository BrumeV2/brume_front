import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/**
 * Bouton pilule de la maquette (composant Figma « Bouton »).
 *
 * - `plein` : action principale, fond encre
 * - `contour` : action secondaire
 * - `clair` : sur photo ou fond sombre
 */
export type UiButtonVariant = 'plein' | 'contour' | 'clair';

@Component({
  selector: 'app-ui-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
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

  readonly presse = output<void>();
}

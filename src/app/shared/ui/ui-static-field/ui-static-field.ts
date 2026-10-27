import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Champ en lecture seule de la maquette : même gabarit qu'une saisie, mais
 * fond sourd et pas de bordure, avec une icône de provenance à droite.
 *
 * Utilisé pour le nom et l'email, qui viennent du fournisseur d'identité et ne
 * se modifient pas depuis Brume.
 */
@Component({
  selector: 'app-ui-static-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ui-static-field.html',
  styleUrl: './ui-static-field.scss',
})
export class UiStaticField {
  readonly libelle = input.required<string>();
  readonly valeur = input.required<string>();
  readonly iconeSrc = input<string>();
  /** Décrit la provenance pour les lecteurs d'écran, ex. « fourni par Google ». */
  readonly iconeAlt = input<string>('');
  readonly aide = input<string>();
}

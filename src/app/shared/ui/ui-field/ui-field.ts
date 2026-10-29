import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

let compteur = 0;

/**
 * Champ de saisie de la maquette : libellé en surtitre, saisie encadrée,
 * texte d'aide et message d'erreur.
 *
 * Le message d'erreur est fourni par la page : la traduction d'une contrainte
 * du contrat en phrase française n'est pas l'affaire de ce composant.
 */
@Component({
  selector: 'app-ui-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  templateUrl: './ui-field.html',
  styleUrl: './ui-field.scss',
})
export class UiField {
  readonly libelle = input.required<string>();
  readonly control = input.required<FormControl<string>>();
  readonly type = input<'text' | 'date' | 'tel' | 'email'>('text');
  readonly aide = input<string>();
  readonly erreur = input<string | null>(null);
  readonly autocomplete = input<string>();
  readonly obligatoire = input(false);

  private readonly identifiant = `champ-${(compteur += 1)}`;

  readonly idSaisie = computed(() => this.identifiant);
  readonly idAide = computed(() => `${this.identifiant}-aide`);
  readonly idErreur = computed(() => `${this.identifiant}-erreur`);

  /** Relie la saisie à son aide et à son erreur pour les lecteurs d'écran. */
  readonly decritPar = computed(() => {
    const parties: string[] = [];
    if (this.erreur() !== null) {
      parties.push(this.idErreur());
    }
    if (this.aide() !== undefined) {
      parties.push(this.idAide());
    }
    return parties.length === 0 ? null : parties.join(' ');
  });
}

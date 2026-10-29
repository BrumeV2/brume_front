import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PIED_DE_PAGE } from '../navigation';

/**
 * « Pied de page / Ordinateur » et « / Mobile » de la maquette.
 *
 * Les entrées pas encore livrées restent visibles mais ne sont pas des liens :
 * aucun lien vers une fonction non livrée (critères d'ADD-094 et ADD-095).
 * La lettre n'a pas encore d'API : son formulaire est remplacé par une mention.
 */
@Component({
  selector: 'app-site-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './site-footer.html',
  styleUrl: './site-footer.scss',
})
export class SiteFooter {
  protected readonly colonnes = PIED_DE_PAGE;
}

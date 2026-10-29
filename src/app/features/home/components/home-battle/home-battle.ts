import { ChangeDetectionStrategy, Component } from '@angular/core';

import { RevealDirective } from '../../../../shared/directives/reveal.directive';

interface Duel {
  readonly melange: string;
  readonly score: string;
}

/**
 * « La Bataille des Mélanges » : présentation du tournoi avec l'aperçu du tableau
 * de la maquette. Le tournoi n'est pas livré : aucun vote ni lien, juste l'idée.
 */
@Component({
  selector: 'app-home-battle',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RevealDirective],
  templateUrl: './home-battle.html',
  styleUrl: './home-battle.scss',
})
export class HomeBattle {
  protected readonly tours: readonly { titre: string; duels: readonly Duel[] }[] = [
    {
      titre: 'Quarts · joués',
      duels: [
        { melange: 'Agrume fumé', score: '58 %' },
        { melange: 'Rose & litchi', score: '61 %' },
        { melange: "Chaï d'hiver", score: '54 %' },
        { melange: 'Sous-bois', score: '66 %' },
      ],
    },
    {
      titre: 'Demi-finales · vote ouvert',
      duels: [
        { melange: 'Agrume fumé', score: '53 %' },
        { melange: 'Rose & litchi', score: '47 %' },
        { melange: "Chaï d'hiver", score: '40 %' },
        { melange: 'Sous-bois', score: '60 %' },
      ],
    },
    { titre: 'Finale · le 18', duels: [{ melange: '?', score: '' }] },
  ];
}

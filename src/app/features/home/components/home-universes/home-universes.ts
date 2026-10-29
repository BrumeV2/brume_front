import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import type { Side } from '../../../../core/state/side.store';
import { RevealDirective } from '../../../../shared/directives/reveal.directive';

interface Univers {
  readonly id: Side | 'cbd';
  readonly nom: string;
  readonly chiffre: string;
  readonly texte: string;
  readonly lien: string;
  readonly categorie: string;
  readonly photo: string;
}

const UNIVERS: readonly Univers[] = [
  {
    id: 'the',
    nom: 'Le thé',
    chiffre: '25 références',
    texte: "Du Japon au Yunnan, des jardins que l'on connaît.",
    lien: 'Voir les thés',
    categorie: 'thes',
    photo: 'images/accueil/univers-the.jpg',
  },
  {
    id: 'cafe',
    nom: 'Le café',
    chiffre: '8 origines',
    texte: 'Torréfié à Paris chaque mardi, en grains ou moulu.',
    lien: 'Voir les cafés',
    categorie: 'cafes',
    photo: 'images/accueil/univers-cafe.jpg',
  },
  {
    id: 'cbd',
    nom: 'Le CBD',
    chiffre: 'Réservé aux majeurs',
    texte: 'Nos thés, mêlés à du chanvre bio de la Sarthe.',
    lien: 'Voir les thés au CBD',
    categorie: 'cbd',
    photo: 'images/accueil/univers-cbd.jpg',
  },
];

/**
 * « Trois univers ». Quand un côté est choisi, son univers passe en premier et
 * prend plus de place (maquette HTML).
 */
@Component({
  selector: 'app-home-universes',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RevealDirective],
  templateUrl: './home-universes.html',
  styleUrl: './home-universes.scss',
})
export class HomeUniverses {
  readonly side = input<Side | null>(null);

  protected readonly univers = computed(() => {
    const ordre = this.side() === 'cafe' ? ['cafe', 'the', 'cbd'] : ['the', 'cafe', 'cbd'];
    return ordre.map((id) => UNIVERS.find((u) => u.id === id) as Univers);
  });
}

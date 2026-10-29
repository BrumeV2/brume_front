import { ChangeDetectionStrategy, Component } from '@angular/core';

import { RevealDirective } from '../../../../shared/directives/reveal.directive';

/** « Le journal » : trois articles à venir, présentés sans lien (le blog n'est pas livré). */
@Component({
  selector: 'app-home-journal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RevealDirective],
  template: `
    <ul class="articles">
      @for (a of articles; track a.titre; let i = $index) {
        <li appReveal [attr.data-delai]="i">
          <div class="articles__photo"><img [src]="a.photo" alt="" loading="lazy" /></div>
          <p class="surtitre articles__rubrique">{{ a.rubrique }}</p>
          <h3 class="articles__titre">{{ a.titre }}</h3>
        </li>
      }
    </ul>
  `,
  styles: `
    :host {
      display: block;
    }

    .articles {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(18rem, 1fr));
      gap: 3.5rem var(--espace-6);
      margin: 0;
      padding: 0;
      list-style: none;

      li {
        display: flex;
        flex-direction: column;
        gap: var(--espace-3);
      }
    }

    .articles__photo {
      aspect-ratio: 3 / 2;
      overflow: hidden;
      background-color: var(--couleur-photo);

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    }

    .articles__rubrique {
      margin-top: var(--espace-2);
      color: var(--couleur-texte-doux);
    }

    .articles__titre {
      font-size: var(--titre-carte-taille);
      line-height: var(--titre-carte-interligne);
      letter-spacing: var(--titre-carte-interlettre);
    }
  `,
})
export class HomeJournal {
  protected readonly articles = [
    {
      rubrique: 'Origines · 6 min',
      titre: 'Long Jing : une journée dans les jardins de Hangzhou',
      photo: 'images/accueil/journal-1.jpg',
    },
    {
      rubrique: 'Préparation · 4 min',
      titre: 'Bien régler la température de son eau, thé par thé',
      photo: 'images/accueil/journal-2.jpg',
    },
    {
      rubrique: 'Culture · 8 min',
      titre: 'Pu-erh : pourquoi certains thés se bonifient avec le temps',
      photo: 'images/accueil/journal-3.jpg',
    },
  ];
}

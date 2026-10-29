import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Ordre des 24 cases de la maquette : mélangé, comme sur un vrai calendrier. */
const CASES = [
  13, 4, 21, 9, 17, 7, 1, 24, 15, 11, 2, 19, 6, 22, 10, 3, 18, 14, 8, 23, 5, 16, 12, 20,
];

/** Aperçu du « Calendrier de l'Avent » : la grille des 24 cases, décorative. */
@Component({
  selector: 'app-home-advent',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ol class="cases" aria-label="Aperçu des 24 cases du calendrier">
      @for (jour of cases; track jour) {
        <li [class.case--noel]="jour === 24">{{ jour }}</li>
      }
    </ol>
  `,
  styles: `
    :host {
      display: block;
    }

    .cases {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: var(--espace-2);
      margin: 0;
      padding: 0;
      list-style: none;

      @media (min-width: 768px) {
        grid-template-columns: repeat(6, minmax(0, 1fr));
      }

      li {
        aspect-ratio: 1;
        padding: var(--espace-2) var(--espace-3);
        border: 1px solid var(--couleur-filet);
        background-color: var(--couleur-papier);
        font-family: var(--police-titre);
        font-weight: 800;
        font-size: clamp(1.125rem, 2vw, 1.75rem);
        line-height: 1;
        transition: transform 0.4s var(--courbe-brume);

        &:hover {
          transform: translateY(-4px);
        }
      }

      .case--noel {
        background-color: var(--couleur-photo);
      }
    }
  `,
})
export class HomeAdvent {
  protected readonly cases = CASES;
}

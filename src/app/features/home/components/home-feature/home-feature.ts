import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Section en deux colonnes de l'accueil : un texte et un visuel (« Notre manière »,
 * « Torréfié le mardi », TeaOMatic, TEA-BOX, calendrier). Empilée sur mobile.
 *
 * Le texte est projeté tel quel, le visuel dans `[media]` :
 * `<app-home-feature><h2>…</h2><img media … /></app-home-feature>`.
 */
@Component({
  selector: 'app-home-feature',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="section" [class.media-a-gauche]="mediaAGauche()">
      <div class="section__texte"><ng-content /></div>
      <div class="section__media"><ng-content select="[media]" /></div>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }

    .section {
      display: grid;
      gap: var(--espace-10);
      align-items: center;

      @media (min-width: 1024px) {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 6vw;
      }
    }

    .section__texte {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 1.75rem;
    }

    @media (min-width: 1024px) {
      .media-a-gauche .section__media {
        order: -1;
      }
    }
  `,
})
export class HomeFeature {
  /** Sur ordinateur, visuel à gauche du texte (il reste dessous sur mobile). */
  readonly mediaAGauche = input(false);
}

import { ChangeDetectionStrategy, Component } from '@angular/core';

const MOTS = [
  'Sencha',
  'Yirgacheffe',
  'Hojicha',
  'Matcha',
  'Huila',
  'Long Jing',
  'Darjeeling',
  'Chanvre',
  'Tie Guan Yin',
  'Espresso',
  'Pu-erh',
  'Bai Mu Dan',
];

/**
 * « Bandeau défilant » : noms de thés et de cafés qui défilent sans fin.
 * Purement décoratif (masqué aux lecteurs d'écran), figé si l'on réduit les animations.
 */
@Component({
  selector: 'app-home-ticker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bandeau" aria-hidden="true">
      <div class="bandeau__piste">
        @for (mot of mots; track $index) {
          <span>{{ mot }}</span>
        }
      </div>
    </div>
  `,
  styleUrl: './home-ticker.scss',
})
export class HomeTicker {
  // Deux fois la liste : à mi-course, la piste reprend exactement où elle a commencé.
  protected readonly mots = [...MOTS, ...MOTS];
}

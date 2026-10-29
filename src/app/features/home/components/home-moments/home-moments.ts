import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import type { ShowcaseMoment } from '../../../../core/api/home.service';
import { RevealDirective } from '../../../../shared/directives/reveal.directive';

/**
 * « Une tasse pour chaque heure » : quatre moments de la journée. Au survol,
 * la case se remplit d'encre depuis le bas (maquette HTML).
 *
 * Chaque moment mène à sa tasse dans le catalogue (recherche par nom), en
 * attendant la fiche produit.
 */
@Component({
  selector: 'app-home-moments',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RevealDirective],
  template: `
    <ul class="moments">
      @for (m of moments(); track m.hour; let i = $index) {
        <li class="moment" appReveal [attr.data-delai]="i">
          <a class="moment__lien" routerLink="/boutique" [queryParams]="{ q: m.product.name }">
            <span class="moment__heure">{{ m.hour }}</span>
            <span class="surtitre moment__libelle">{{ m.label }}</span>
            <span class="moment__produit">{{ m.product.name }}</span>
            <span class="moment__legende">{{ m.caption }} →</span>
          </a>
        </li>
      }
    </ul>
  `,
  styleUrl: './home-moments.scss',
})
export class HomeMoments {
  readonly moments = input.required<readonly ShowcaseMoment[]>();
}

import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import type { ShowcaseProduct } from '../../../../core/api/home.service';
import { RevealDirective } from '../../../../shared/directives/reveal.directive';
import { UiProductCard } from '../../../../shared/ui/ui-product-card/ui-product-card';

/**
 * « Les préférés de la maison » : quatre cartes produit, cliquables. Tant que la
 * fiche produit n'est pas livrée, elles mènent au produit dans le catalogue
 * (recherche par nom) : à repointer vers `/boutique/:slug` avec la fiche.
 */
@Component({
  selector: 'app-home-favorites',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RevealDirective, UiProductCard],
  template: `
    <ul class="grille">
      @for (p of produits(); track p.slug; let i = $index) {
        <li appReveal [attr.data-delai]="i % 4">
          <app-ui-product-card
            [nom]="p.name"
            [prixCents]="p.priceCents"
            [photo]="p.image"
            [origine]="p.origin"
            [notes]="p.notes"
            [moment]="p.moment"
            [badge]="p.badge"
            lien="/boutique"
            [params]="{ q: p.name }"
          />
        </li>
      }
    </ul>
  `,
  styles: `
    :host {
      display: block;
    }

    .grille {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(16.875rem, 1fr));
      gap: 3.5rem var(--espace-6);
      margin: 0;
      padding: 0;
      list-style: none;
    }
  `,
})
export class HomeFavorites {
  readonly produits = input.required<readonly ShowcaseProduct[]>();
}

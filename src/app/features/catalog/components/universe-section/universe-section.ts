import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { UiProductCard } from '../../../../shared/ui/ui-product-card/ui-product-card';
import type { SectionUnivers } from '../../catalog.types';
import { badgeDe, momentDe } from '../../catalog-presentation';

/**
 * Un univers et ses premiers produits, tel que la maquette range le catalogue
 * quand aucun filtre n'est posé : titre, phrase de présentation et
 * « Voir tout → » sur une ligne, puis une grille de quatre cartes.
 */
@Component({
  selector: 'app-universe-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, UiProductCard],
  templateUrl: './universe-section.html',
  styleUrl: './universe-section.scss',
})
export class UniverseSection {
  readonly section = input.required<SectionUnivers>();

  protected readonly libelleMoment = momentDe;
  protected readonly mentionPhoto = badgeDe;
}

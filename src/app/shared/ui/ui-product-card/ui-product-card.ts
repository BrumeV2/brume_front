import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PricePipe } from '../../pipes/price-pipe';

/**
 * « Carte produit » de la maquette : grille du catalogue, préférés de l'accueil,
 * suggestions. Photo au format 4:5.
 *
 * Purement présentationnelle : elle reçoit des valeurs simples, pas un type de
 * l'API, pour servir à toutes les features. Avec `lien`, toute la carte est
 * cliquable ; sans, elle reste un simple aperçu.
 */
@Component({
  selector: 'app-ui-product-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet, RouterLink, PricePipe],
  templateUrl: './ui-product-card.html',
  styleUrl: './ui-product-card.scss',
})
export class UiProductCard {
  readonly nom = input.required<string>();
  readonly prixCents = input.required<number>();
  readonly photo = input<string | null>(null);
  /** Ligne en petites capitales sous le nom, ex. « Vert · Uji, Japon ». */
  readonly origine = input<string | null>(null);
  readonly notes = input<string | null>(null);
  /** Moment de dégustation, à droite des notes, ex. « Matin ». */
  readonly moment = input<string | null>(null);
  /** Pastille en haut à gauche de la photo, ex. « Préféré ». */
  readonly badge = input<string | null>(null);
  readonly lien = input<string | null>(null);
}

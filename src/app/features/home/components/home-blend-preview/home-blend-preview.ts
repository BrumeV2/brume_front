import { ChangeDetectionStrategy, Component, computed, effect, input, signal } from '@angular/core';

import type { Side } from '../../../../core/state/side.store';
import { UiChip } from '../../../../shared/ui/ui-chip/ui-chip';

interface Ingredient {
  readonly nom: string;
  /** Couleur de sa part dans la barre de proportions. */
  readonly couleur: string;
}

const THE = {
  bases: [
    { nom: 'Sencha', couleur: '#7e8b5a' },
    { nom: 'Assam', couleur: '#6b4a35' },
    { nom: 'Rooibos', couleur: '#9a5b3c' },
    { nom: 'Thé blanc', couleur: '#b9ae8e' },
  ],
  ingredients: [
    { nom: 'Gingembre', couleur: '#c49a4a' },
    { nom: 'Citron', couleur: '#d8c35a' },
    { nom: 'Cannelle', couleur: '#8c5a3c' },
    { nom: 'Rose', couleur: '#c99a9a' },
    { nom: 'Vanille', couleur: '#d9cba8' },
    { nom: 'Menthe', couleur: '#7fa08a' },
  ],
};

const CAFE = {
  bases: [
    { nom: 'Café Brésil', couleur: '#4a3022' },
    { nom: 'Café Éthiopie', couleur: '#7a4a2a' },
    { nom: 'Café décaféiné', couleur: '#5e4636' },
  ],
  ingredients: [
    { nom: 'Cacao', couleur: '#4a3428' },
    { nom: 'Noisette', couleur: '#a07850' },
    { nom: 'Cannelle', couleur: '#8c5a3c' },
    { nom: 'Vanille', couleur: '#d9cba8' },
    { nom: 'Orange', couleur: '#d98a3a' },
    { nom: 'Cardamome', couleur: '#9aae7a' },
  ],
};

const INGREDIENTS_MAX = 3;
/** Part de la base dès qu'il y a des ingrédients ; le reste est partagé à parts égales. */
const PART_BASE = 70;

/**
 * Aperçu du configurateur TeaOMatic (maquette) : on essaie, rien n'est envoyé.
 * Le vrai configurateur n'est pas livré : pas de lien vers lui.
 */
@Component({
  selector: 'app-home-blend-preview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UiChip],
  templateUrl: './home-blend-preview.html',
  styleUrl: './home-blend-preview.scss',
})
export class HomeBlendPreview {
  readonly side = input<Side | null>(null);

  protected readonly catalogue = computed(() => (this.side() === 'cafe' ? CAFE : THE));
  protected readonly base = signal<Ingredient>(THE.bases[0]);
  protected readonly choisis = signal<readonly Ingredient[]>([
    THE.ingredients[0],
    THE.ingredients[1],
  ]);

  /** Parts de la barre, en pourcentage, base comprise. */
  protected readonly parts = computed(() => {
    const ingredients = this.choisis();
    if (ingredients.length === 0) return [{ ...this.base(), part: 100 }];
    const reste = Math.round((100 - PART_BASE) / ingredients.length);
    return [
      { ...this.base(), part: PART_BASE },
      ...ingredients.map((ingredient) => ({ ...ingredient, part: reste })),
    ];
  });

  /** « Sencha · gingembre & citron ». */
  protected readonly nomDuMelange = computed(() => {
    const noms = this.choisis().map((ingredient) => ingredient.nom.toLowerCase());
    if (noms.length === 0) return this.base().nom;
    const liste =
      noms.length === 1 ? noms[0] : `${noms.slice(0, -1).join(', ')} & ${noms[noms.length - 1]}`;
    return `${this.base().nom} · ${liste}`;
  });

  constructor() {
    // Changer de côté change de catalogue : on repart de sa première base, sans ingrédient étranger.
    effect(() => {
      const catalogue = this.catalogue();
      this.base.set(catalogue.bases[0]);
      this.choisis.set(catalogue.ingredients.slice(0, 2));
    });
  }

  protected estChoisi(ingredient: Ingredient): boolean {
    return this.choisis().includes(ingredient);
  }

  protected basculer(ingredient: Ingredient): void {
    this.choisis.update((choisis) => {
      if (choisis.includes(ingredient)) return choisis.filter((i) => i !== ingredient);
      return choisis.length < INGREDIENTS_MAX ? [...choisis, ingredient] : choisis;
    });
  }
}

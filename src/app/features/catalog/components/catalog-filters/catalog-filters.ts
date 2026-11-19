import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import type { Category, IngredientsMatch } from '../../../../core/api/api.types';
import {
  CAFFEINES,
  CATALOG_RULES,
  LIBELLES_CAFFEINE,
  LIBELLES_MOMENT,
  LIBELLES_SORT,
  LIBELLES_TYPE,
  MOMENTS,
  PRODUCT_TYPES,
  SORTS,
  TRANCHES_PRIX,
} from '../../../../core/api/catalog-rules';
import { UiChip } from '../../../../shared/ui/ui-chip/ui-chip';
import type { ChampFiltre, CritereActif, EtatFiltres, OptionFiltre } from '../../catalog.types';
import { FilterMenu } from '../filter-menu/filter-menu';

/**
 * « Barre de filtres (collante sous le menu) » de la maquette : les onglets
 * d'univers, le tri, les pastilles de filtre, et l'indicateur des critères
 * posés.
 *
 * Présentationnelle : elle reçoit l'état des filtres et annonce les
 * changements. C'est la page qui décide ce qu'elle en fait — ici, les écrire
 * dans l'URL.
 */
@Component({
  selector: 'app-catalog-filters',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FilterMenu, UiChip],
  templateUrl: './catalog-filters.html',
  styleUrl: './catalog-filters.scss',
})
export class CatalogFilters {
  readonly filtres = input.required<EtatFiltres>();
  /** Univers à proposer. La page n'envoie que ceux qui ont des produits. */
  readonly categories = input.required<readonly Category[]>();

  /**
   * Nom de chaque ingrédient posé, par UUID. Un UUID absent est affiché
   * « Ingrédient inconnu » : une URL peut en porter un que le référentiel n'a
   * pas, ou plus.
   */
  readonly nomsIngredients = input<Readonly<Record<string, string>>>({});

  /** Un filtre change. `null` retire le critère. */
  readonly filtre = output<{ champ: ChampFiltre; valeur: string | null }>();
  readonly tri = output<string>();
  readonly reinitialisation = output<void>();
  /** Retire un seul ingrédient, par son UUID. */
  readonly retraitIngredient = output<string>();
  readonly combinaison = output<IngredientsMatch>();

  protected readonly ingredientsChoisis = computed(() => this.filtres().ingredients ?? []);
  protected readonly tousLesIngredients = computed(() => this.filtres().ingredientsMatch === 'all');

  protected readonly optionsType: readonly OptionFiltre[] = PRODUCT_TYPES.map((valeur) => ({
    valeur,
    libelle: LIBELLES_TYPE[valeur],
  }));

  protected readonly optionsMoment: readonly OptionFiltre[] = MOMENTS.map((valeur) => ({
    valeur,
    libelle: LIBELLES_MOMENT[valeur],
  }));

  protected readonly optionsCaffeine: readonly OptionFiltre[] = CAFFEINES.map((valeur) => ({
    valeur,
    libelle: LIBELLES_CAFFEINE[valeur],
  }));

  protected readonly optionsPrix: readonly OptionFiltre[] = TRANCHES_PRIX.map((tranche) => ({
    valeur: tranche.id,
    libelle: tranche.libelle,
  }));

  protected readonly optionsTri: readonly OptionFiltre[] = SORTS.map((valeur) => ({
    valeur,
    libelle: LIBELLES_SORT[valeur],
  }));

  /** Tranche de prix déduite des deux bornes portées par l'URL. */
  protected readonly trancheChoisie = computed<string | null>(() => {
    const { minPriceCents, maxPriceCents } = this.filtres();
    if (minPriceCents === undefined && maxPriceCents === undefined) return null;
    const tranche = TRANCHES_PRIX.find(
      (candidate) =>
        candidate.minPriceCents === minPriceCents && candidate.maxPriceCents === maxPriceCents,
    );
    return tranche?.id ?? null;
  });

  protected readonly univers = computed(() => this.filtres().category ?? null);

  /**
   * Tri en vigueur, et non « celui que l'URL porte » : sans paramètre `sort`,
   * l'API trie quand même, et le sélecteur doit montrer cet ordre-là plutôt
   * qu'un libellé de repli.
   */
  protected readonly triChoisi = computed(() => this.filtres().sort ?? CATALOG_RULES.defaultSort);

  /** Re-choisir le tri en vigueur revient à revenir au tri par défaut. */
  protected readonly triParDefaut = CATALOG_RULES.defaultSort;

  /**
   * Critères posés, dans l'ordre où la barre les présente.
   *
   * Une valeur que la barre ne connaît pas — une URL écrite à la main — est
   * affichée telle quelle plutôt qu'escamotée : sans libellé, on verrait une
   * croix nue sans savoir ce qu'elle retire.
   */
  protected readonly criteresActifs = computed<readonly CritereActif[]>(() => {
    const filtres = this.filtres();
    const criteres: CritereActif[] = [];

    if (filtres.category !== undefined) {
      const categorie = this.categories().find((c) => c.slug === filtres.category);
      criteres.push({ champ: 'category', libelle: categorie?.name ?? filtres.category });
    }
    if (filtres.type !== undefined) {
      criteres.push({ champ: 'type', libelle: LIBELLES_TYPE[filtres.type] ?? filtres.type });
    }
    if (filtres.moment !== undefined) {
      criteres.push({
        champ: 'moment',
        libelle: LIBELLES_MOMENT[filtres.moment] ?? filtres.moment,
      });
    }
    if (filtres.caffeine !== undefined) {
      criteres.push({
        champ: 'caffeine',
        libelle: LIBELLES_CAFFEINE[filtres.caffeine] ?? filtres.caffeine,
      });
    }
    const tranche = TRANCHES_PRIX.find((candidate) => candidate.id === this.trancheChoisie());
    if (tranche !== undefined) {
      criteres.push({ champ: 'prix', libelle: tranche.libelle });
    }
    if (filtres.inStock === true) {
      criteres.push({ champ: 'inStock', libelle: 'En stock' });
    }
    if (filtres.q !== undefined && filtres.q !== '') {
      criteres.push({ champ: 'q', libelle: `« ${filtres.q} »` });
    }
    for (const id of filtres.ingredients ?? []) {
      criteres.push({
        champ: 'ingredients',
        valeur: id,
        libelle: `Contient : ${this.nomsIngredients()[id] ?? 'ingrédient inconnu'}`,
      });
    }

    return criteres;
  });

  protected changer(champ: ChampFiltre, valeur: string | null): void {
    this.filtre.emit({ champ, valeur });
  }

  protected retirer(critere: CritereActif): void {
    if (critere.champ === 'ingredients' && critere.valeur !== undefined) {
      this.retraitIngredient.emit(critere.valeur);
    } else {
      this.changer(critere.champ, null);
    }
  }
}

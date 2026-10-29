import type { CatalogQuery } from '../../core/api/api.types';

/**
 * Types propres à l'affichage du catalogue. Rien ici ne circule vers l'API :
 * les filtres partent toujours sous la forme d'un `CatalogQuery`.
 */

/** Une entrée d'un menu de filtre. */
export interface OptionFiltre {
  readonly valeur: string;
  readonly libelle: string;
}

/**
 * Champs que la barre de filtres sait poser et retirer.
 *
 * `prix` n'est pas un paramètre de l'API mais une tranche, qui en pose deux
 * (`minPriceCents` et `maxPriceCents`) : c'est le seul endroit où l'affichage
 * et le contrat ne se superposent pas exactement.
 */
export type ChampFiltre = 'category' | 'type' | 'moment' | 'caffeine' | 'prix' | 'inStock' | 'q';

/**
 * Critère posé, tel que l'indicateur l'affiche : un libellé lisible et de quoi
 * le retirer sans toucher aux autres.
 */
export interface CritereActif {
  readonly champ: ChampFiltre;
  readonly libelle: string;
}

/** Filtres portés par l'URL. `page` et `sort` en font partie. */
export type EtatFiltres = CatalogQuery;

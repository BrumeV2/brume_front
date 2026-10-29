import type { Params } from '@angular/router';

/**
 * Une entrée de navigation. `lien: null` = fonction pas encore livrée : elle
 * n'est jamais rendue en lien (critère d'ADD-094 / ADD-095), au mieux en texte
 * « bientôt » dans le pied de page.
 */
export interface EntreeNavigation {
  readonly libelle: string;
  readonly lien: string | null;
  readonly params?: Params;
}

/** Les univers du catalogue (filtre `category` de la feature catalogue). */
export const UNIVERS: readonly EntreeNavigation[] = [
  { libelle: 'Thés', lien: '/boutique', params: { category: 'thes' } },
  { libelle: 'Cafés', lien: '/boutique', params: { category: 'cafes' } },
  { libelle: 'CBD', lien: '/boutique', params: { category: 'cbd' } },
];

export const COMPTE: EntreeNavigation = { libelle: 'Compte', lien: '/compte' };

/** Colonnes du pied de page, dans l'ordre de la maquette. */
export const PIED_DE_PAGE: readonly { titre: string; entrees: readonly EntreeNavigation[] }[] = [
  {
    titre: 'Boutique',
    entrees: [
      ...UNIVERS,
      { libelle: 'TEA-BOX', lien: null },
      { libelle: 'Carte cadeau', lien: null },
    ],
  },
  {
    titre: 'Et aussi',
    entrees: [
      { libelle: 'TeaOMatic', lien: null },
      { libelle: 'La Bataille des Mélanges', lien: null },
      { libelle: "Calendrier de l'Avent", lien: null },
      { libelle: 'Le journal', lien: null },
      { libelle: 'Le quiz', lien: null },
    ],
  },
];

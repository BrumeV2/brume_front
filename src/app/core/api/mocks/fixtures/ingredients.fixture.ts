import type { IngredientType } from '../../api.types';

/**
 * Référentiel d'ingrédients simulé et composition des produits de
 * `catalog.fixture.ts` (US-015).
 *
 * Même modèle que le back (`docs/CATALOGUE-INGREDIENTS.md`) : un ingrédient est
 * une entrée du référentiel, jamais un texte libre sur un produit, et ses
 * synonymes (`aliases`) pointent vers lui seul. `productCount` n'est pas écrit
 * ici : l'implémentation simulée le calcule sur les produits **publiés**, comme
 * l'API.
 *
 * Le jeu couvre les cas de la story :
 * - **Thé vert** n'est que dans une partie des thés (les quatre thés verts sur
 *   sept) ; **Café robusta** dans un seul des cinq cafés ;
 * - **Anis étoilé** se trouve aussi par son synonyme « badiane » ;
 * - **Hibiscus** (« bissap ») n'entre dans aucun produit, et **Oolong** dans un
 *   produit non publié seulement : tous deux existent mais ne donnent rien.
 */

export interface MockIngredient {
  readonly id: string;
  readonly name: string;
  readonly type: IngredientType;
  readonly aliases: readonly string[];
}

/** `d0000000-…-0000000000NN`, des UUID v4 valides comme ceux du back. */
const id = (n: number): string => `d0000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

export const INGREDIENTS_FIXTURE: readonly MockIngredient[] = [
  { id: id(1), name: 'Thé vert', type: 'base', aliases: [] },
  { id: id(2), name: 'Thé noir', type: 'base', aliases: [] },
  { id: id(3), name: 'Thé blanc', type: 'base', aliases: [] },
  { id: id(4), name: 'Oolong', type: 'base', aliases: ['wulong', 'thé bleu-vert'] },
  { id: id(5), name: 'Feuilles torréfiées', type: 'base', aliases: ['hojicha'] },
  { id: id(6), name: 'Café arabica', type: 'base', aliases: [] },
  { id: id(7), name: 'Café robusta', type: 'base', aliases: [] },
  { id: id(8), name: 'Riz soufflé', type: 'dried_ingredient', aliases: ['genmai'] },
  { id: id(9), name: 'Anis étoilé', type: 'dried_ingredient', aliases: ['badiane'] },
  { id: id(10), name: 'Cannelle', type: 'dried_ingredient', aliases: [] },
  { id: id(11), name: 'Cardamome', type: 'dried_ingredient', aliases: [] },
  { id: id(12), name: 'Gingembre', type: 'dried_ingredient', aliases: [] },
  { id: id(13), name: 'Hibiscus', type: 'dried_ingredient', aliases: ['bissap', 'karkadé'] },
  { id: id(14), name: 'Chanvre', type: 'dried_ingredient', aliases: ['cannabis sativa'] },
  { id: id(15), name: 'Huile essentielle de bergamote', type: 'essential_oil', aliases: [] },
];

/** Identifiant d'un ingrédient par son nom, pour écrire tests et compositions lisiblement. */
export function idIngredient(nom: string): string {
  const ingredient = INGREDIENTS_FIXTURE.find((candidat) => candidat.name === nom);
  if (ingredient === undefined) throw new Error(`Ingrédient simulé inconnu : ${nom}`);
  return ingredient.id;
}

/** Composition de chaque produit, par slug. Un produit absent n'a aucun ingrédient déclaré. */
export const COMPOSITIONS: Readonly<Record<string, readonly string[]>> = {
  'matcha-ceremonie': ['Thé vert'],
  'sencha-du-matin': ['Thé vert'],
  'long-jing': ['Thé vert'],
  genmaicha: ['Thé vert', 'Riz soufflé'],
  'darjeeling-first-flush': ['Thé noir'],
  'chai-maison': ['Thé noir', 'Cannelle', 'Cardamome', 'Gingembre', 'Anis étoilé'],
  'hojicha-du-soir': ['Feuilles torréfiées'],
  'espresso-maison': ['Café arabica', 'Café robusta'],
  'ethiopie-yirgacheffe': ['Café arabica'],
  'colombie-huila': ['Café arabica'],
  'kenya-aa': ['Café arabica'],
  'decafeine-perou': ['Café arabica'],
  'earl-grey-au-chanvre': ['Thé noir', 'Huile essentielle de bergamote', 'Chanvre'],
  'the-blanc-au-chanvre': ['Thé blanc', 'Chanvre'],
  'oolong-de-printemps': ['Oolong'],
};

/** Identifiants des ingrédients d'un produit. */
export function ingredientsDuProduit(slug: string): readonly string[] {
  return (COMPOSITIONS[slug] ?? []).map(idIngredient);
}

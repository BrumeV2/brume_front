/** Espaces de saisie normalisés ; une requête vide retire le critère de recherche. */
export function nettoyerRecherche(texte: string): string {
  return texte.trim().replace(/\s+/gu, ' ');
}

/** Texte comparable : espaces nettoyés, sans casse ni accents. */
function normaliser(texte: string): string {
  return nettoyerRecherche(texte)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

/** Recherche de sous-chaîne sur le nom uniquement, sans casse ni accents. */
export function nomCorrespond(nom: string, recherche: string): boolean {
  return normaliser(nom).includes(normaliser(recherche));
}

/**
 * Règle de synonymes d'US-015, telle que le back l'applique sur
 * `GET /ingredients?q=` : **chaque mot** de la recherche (ET) doit figurer, en
 * sous-chaîne, dans le nom **ou** dans l'un des synonymes, sans casse ni accents.
 *
 * Utilisée par l'implémentation simulée seulement : avec la vraie API, c'est le
 * back qui décide.
 */
export function ingredientCorrespond(
  ingredient: { readonly name: string; readonly aliases: readonly string[] },
  recherche: string,
): boolean {
  const champs = [ingredient.name, ...ingredient.aliases].map(normaliser);
  return mots(recherche).every((mot) => champs.some((champ) => champ.includes(mot)));
}

/**
 * Synonymes qui expliquent une suggestion : quand « badiane » propose
 * « Anis étoilé », c'est « badiane » qu'il faut montrer, sinon la suggestion
 * paraît hors sujet. Vide quand le nom suffit à expliquer la correspondance.
 */
export function synonymesTrouves(
  ingredient: { readonly name: string; readonly aliases: readonly string[] },
  recherche: string,
): string[] {
  const nom = normaliser(ingredient.name);
  const cherches = mots(recherche);
  if (cherches.every((mot) => nom.includes(mot))) return [];
  return ingredient.aliases.filter((synonyme) =>
    cherches.some((mot) => normaliser(synonyme).includes(mot)),
  );
}

/** Mots distincts d'une recherche, comparables. */
function mots(recherche: string): string[] {
  return [...new Set(normaliser(recherche).split(' ').filter(Boolean))];
}

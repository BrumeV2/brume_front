/** Espaces de saisie normalisés ; une requête vide retire le critère de recherche. */
export function nettoyerRecherche(texte: string): string {
  return texte.trim().replace(/\s+/gu, ' ');
}

/** Recherche de sous-chaîne sur le nom uniquement, sans casse ni accents. */
export function nomCorrespond(nom: string, recherche: string): boolean {
  const normaliser = (texte: string): string =>
    nettoyerRecherche(texte)
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase();
  return normaliser(nom).includes(normaliser(recherche));
}

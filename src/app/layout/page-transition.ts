import type { ActivatedRouteSnapshot } from '@angular/router';
import type { ViewTransitionInfo } from '@angular/router';

/** Animation jouée entre deux pages (classes `transition-page-*` de styles.scss). */
export type GenreDeTransition = 'fondu' | 'glisse-gauche' | 'glisse-droite' | 'aucune';

/** Ordre des univers du catalogue : on glisse vers la gauche en avançant dans cet ordre. */
const ORDRE_DES_UNIVERS = ['', 'thes', 'cafes', 'cbd'];

/** Chemin de la page affichée (« boutique », « compte/profil »), sans paramètres. */
function cheminDe(racine: ActivatedRouteSnapshot): string {
  const segments: string[] = [];
  let route: ActivatedRouteSnapshot | null = racine;
  while (route !== null) {
    segments.push(...route.url.map((segment) => segment.path));
    route = route.firstChild;
  }
  return segments.join('/');
}

/**
 * Choisit l'animation entre deux pages, comme la maquette HTML :
 * - autre page : fondu qui monte ;
 * - catalogue, changement d'univers : la page glisse dans le sens de l'ordre des univers ;
 * - même page, seuls d'autres paramètres changent (tri, filtres) : rien, sinon chaque
 *   filtre ferait clignoter la liste.
 *
 * À venir avec la fiche produit : la photo, le nom et le prix de la carte cliquée
 * rejoignent leur place dans la fiche (« morph » de la maquette).
 */
export function genreDeTransition(
  depuis: ActivatedRouteSnapshot,
  vers: ActivatedRouteSnapshot,
): GenreDeTransition {
  const cheminDepuis = cheminDe(depuis);
  if (cheminDepuis !== cheminDe(vers)) return 'fondu';
  if (cheminDepuis !== 'boutique') return 'aucune';

  const avant = ORDRE_DES_UNIVERS.indexOf(String(depuis.queryParams['category'] ?? ''));
  const apres = ORDRE_DES_UNIVERS.indexOf(String(vers.queryParams['category'] ?? ''));
  if (avant === apres) return 'aucune';
  return apres > avant ? 'glisse-gauche' : 'glisse-droite';
}

const animationsReduites = () =>
  globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? true;

/**
 * Branché sur le routeur (`withViewTransitions({ onViewTransitionCreated })`) :
 * pose les classes de l'animation choisie le temps de la transition. Le menu
 * reste en place (`menu-fixe`) pendant que la page change dessous.
 */
export function animerLaNavigation({ transition, from, to }: ViewTransitionInfo): void {
  const genre = genreDeTransition(from, to);
  // Pendant l'intro (un <dialog> ouvert) ou si l'on réduit les animations : changement net.
  const dialogOuvert = globalThis.document?.querySelector('dialog[open]') !== null;
  if (genre === 'aucune' || animationsReduites() || dialogOuvert) {
    transition.skipTransition();
    return;
  }

  const classes = ['menu-fixe', `transition-page-${genre}`];
  const html = globalThis.document.documentElement;
  html.classList.add(...classes);
  transition.finished.catch(() => undefined).finally(() => html.classList.remove(...classes));
}

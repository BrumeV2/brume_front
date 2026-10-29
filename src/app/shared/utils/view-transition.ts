/**
 * Joue une mise à jour de l'interface dans une transition de vue, si le
 * navigateur la connaît et que l'utilisateur n'a pas demandé moins d'animations.
 *
 * `classe` est posée sur `<html>` le temps de la transition : elle choisit
 * l'animation (`transition-fondu`, `transition-intro` dans styles.scss).
 * `rendre` doit appliquer la mise à jour au DOM de façon synchrone
 * (ex. `ApplicationRef.tick()`) : le navigateur capture l'état d'après juste après.
 */
export function avecTransitionDeVue(
  classe: string,
  miseAJour: () => void,
  rendre: () => void,
): Promise<void> {
  const document = globalThis.document;
  const reduit = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? true;

  if (typeof document?.startViewTransition !== 'function' || reduit) {
    miseAJour();
    return Promise.resolve();
  }

  document.documentElement.classList.add(classe);
  const transition = document.startViewTransition(() => {
    miseAJour();
    rendre();
  });
  return transition.finished
    .catch(() => undefined)
    .finally(() => document.documentElement.classList.remove(classe));
}

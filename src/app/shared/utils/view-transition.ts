/**
 * Joue une mise à jour de l'interface dans une transition de vue, si le
 * navigateur la connaît et que l'utilisateur n'a pas demandé moins d'animations.
 *
 * `classes` sont posées sur `<html>` le temps de la transition : elles choisissent
 * l'animation (`transition-fondu`, `transition-intro`, `menu-fixe` dans styles.scss).
 * `rendre` doit appliquer la mise à jour au DOM de façon synchrone
 * (ex. `ApplicationRef.tick()`) : le navigateur capture l'état d'après juste après.
 */
export function avecTransitionDeVue(
  classes: string | readonly string[],
  miseAJour: () => void,
  rendre: () => void,
): Promise<void> {
  const document = globalThis.document;
  const reduit = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? true;

  if (typeof document?.startViewTransition !== 'function' || reduit) {
    miseAJour();
    return Promise.resolve();
  }

  const liste = typeof classes === 'string' ? [classes] : classes;
  document.documentElement.classList.add(...liste);
  const transition = document.startViewTransition(() => {
    miseAJour();
    rendre();
  });
  return transition.finished
    .catch(() => undefined)
    .finally(() => document.documentElement.classList.remove(...liste));
}

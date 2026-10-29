import { DestroyRef, Directive, ElementRef, afterNextRender, inject } from '@angular/core';

/**
 * Apparition au défilement (« .rv » et « .mask » de la maquette HTML) : ajoute la
 * classe `est-visible` quand l'élément entre à l'écran, une seule fois.
 *
 * Les styles d'apparition sont globaux (`styles.scss`, `[appReveal]`), et neutralisés
 * si l'utilisateur a demandé à réduire les animations.
 *
 * Usage : `<h2 appReveal>`, `<figure appReveal class="masque">`, délai avec
 * `data-delai="1"` (à « 3 »).
 */
@Directive({ selector: '[appReveal]' })
export class RevealDirective {
  constructor() {
    const element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      if (typeof IntersectionObserver === 'undefined') {
        element.classList.add('est-visible');
        return;
      }
      const observer = new IntersectionObserver(
        (entrees) => {
          if (entrees.some((entree) => entree.isIntersecting)) {
            element.classList.add('est-visible');
            observer.disconnect();
          }
        },
        { threshold: 0.15, rootMargin: '0px 0px -6% 0px' },
      );
      observer.observe(element);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }
}

import { ChangeDetectionStrategy, Component, ElementRef, inject, signal } from '@angular/core';

import { RevealDirective } from '../../../../shared/directives/reveal.directive';

/** « Manifeste » : grande photo sombre en profondeur, une phrase au centre. */
@Component({
  selector: 'app-home-manifesto',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RevealDirective],
  host: { '(window:scroll)': 'suivreDefilement()' },
  template: `
    <section class="manifeste" aria-labelledby="titre-manifeste">
      <img
        class="manifeste__photo"
        src="images/accueil/manifeste.jpg"
        alt=""
        loading="lazy"
        [style.transform]="'translate3d(0,' + decalage() + 'px,0)'"
      />
      <div class="manifeste__texte" appReveal>
        <p class="surtitre">Manifeste</p>
        <h2 id="titre-manifeste" class="titre-xl">
          <span>Une tasse,</span>
          <span>puis une autre.</span>
        </h2>
        <p class="texte-intro">
          Ralentir n'est pas un luxe. C'est une habitude, qui se prend à 90°, pendant deux minutes.
        </p>
      </div>
    </section>
  `,
  styles: `
    :host {
      display: block;
    }

    .manifeste {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 90vh;
      min-height: 35rem;
      overflow: hidden;
      color: var(--couleur-blanc);
      text-align: center;

      &::after {
        content: '';
        position: absolute;
        inset: 0;
        background-color: rgba(0, 0, 0, 0.42);
      }
    }

    .manifeste__photo {
      position: absolute;
      inset: -15% 0;
      width: 100%;
      height: 130%;
      object-fit: cover;
      filter: saturate(0.5);
    }

    .manifeste__texte {
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1.75rem;
      max-width: 60rem;
      padding-inline: var(--espace-5);

      .texte-intro {
        max-width: 30rem;
      }
    }
  `,
})
export class HomeManifesto {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  protected readonly decalage = signal(0);

  protected suivreDefilement(): void {
    if (globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const cadre = this.element.getBoundingClientRect();
    if (cadre.bottom > 0 && cadre.top < window.innerHeight) this.decalage.set(cadre.top * -0.18);
  }
}

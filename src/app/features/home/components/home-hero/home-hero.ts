import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import type { Params } from '@angular/router';

import type { Side } from '../../../../core/state/side.store';
import { UiButton } from '../../../../shared/ui/ui-button/ui-button';

interface VarianteHaut {
  readonly surtitre: string;
  readonly boutique: { readonly libelle: string; readonly params: Params | null };
  /** Photo fixe à la place de la vidéo (côté café). */
  readonly photo: string | null;
}

const VARIANTES: Record<Side | 'neutre', VarianteHaut> = {
  neutre: {
    surtitre: 'Thé · Café · Thés au CBD · Paris',
    boutique: { libelle: 'La boutique', params: null },
    photo: null,
  },
  the: {
    surtitre: "Côté thé · 25 thés du Japon à l'Inde",
    boutique: { libelle: 'La boutique des thés', params: { category: 'thes' } },
    photo: null,
  },
  cafe: {
    surtitre: 'Côté café · torréfié à Paris chaque mardi',
    boutique: { libelle: 'Nos cafés', params: { category: 'cafes' } },
    photo: 'images/accueil/v60.jpg',
  },
};

const reduireLesAnimations = () =>
  globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? true;

/**
 * « Haut de page » de l'accueil : vidéo (photo en attendant, et côté café),
 * titre révélé ligne à ligne, léger effet de profondeur au défilement.
 *
 * La vidéo boucle plus de 5 secondes : un bouton permet de la mettre en pause
 * (WCAG 2.2.2). Elle ne démarre pas si l'utilisateur réduit les animations.
 */
@Component({
  selector: 'app-home-hero',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UiButton],
  templateUrl: './home-hero.html',
  styleUrl: './home-hero.scss',
  host: { '(window:scroll)': 'suivreDefilement()' },
})
export class HomeHero {
  readonly side = input<Side | null>(null);
  /** Faux tant que l'écran d'intro couvre la page : la vidéo attend. */
  readonly actif = input(true);
  /** Clic sur la photo (hors boutons) : descendre vers la suite. */
  readonly decouvrir = output<void>();

  protected readonly variante = computed(() => VARIANTES[this.side() ?? 'neutre']);
  protected readonly avecVideo = computed(() => this.variante().photo === null);

  protected readonly videoPrete = signal(false);
  protected readonly enPause = signal(reduireLesAnimations());
  protected readonly decalage = signal(0);
  protected readonly curseur = signal<{ x: number; y: number } | null>(null);

  private readonly video = viewChild<ElementRef<HTMLVideoElement>>('video');

  constructor() {
    effect(() => {
      const video = this.video()?.nativeElement;
      if (video === undefined) return;
      if (this.actif() && !this.enPause()) void video.play().catch(() => undefined);
      else video.pause();
    });
  }

  protected basculerVideo(): void {
    this.enPause.update((pause) => !pause);
  }

  protected suivreDefilement(): void {
    if (reduireLesAnimations()) return;
    const y = window.scrollY;
    // Seulement tant que le haut de page est visible.
    if (y < window.innerHeight * 1.2) this.decalage.set(y * 0.18);
  }

  protected suivreCurseur(evenement: MouseEvent): void {
    const surUnControle = (evenement.target as HTMLElement).closest('a, button');
    this.curseur.set(surUnControle ? null : { x: evenement.clientX, y: evenement.clientY });
  }

  protected cliquer(evenement: MouseEvent): void {
    if (!(evenement.target as HTMLElement).closest('a, button')) this.decouvrir.emit();
  }
}

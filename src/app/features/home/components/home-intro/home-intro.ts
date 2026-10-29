import {
  ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';

import { Side, SideStore } from '../../../../core/state/side.store';
import { avecTransitionDeVue } from '../../../../shared/utils/view-transition';

import { HomeIntroPanel } from './home-intro-panel';

type Etat = 'repos' | Side | `choix-${Side}` | `balayage-${Side}`;

/**
 * Décalage des deux volets pour chaque étape, en vw (ordinateur) ou vh (mobile).
 * Valeurs de la maquette HTML : [volet thé, volet café].
 */
const POSITIONS: Record<Etat, readonly [number, number]> = {
  repos: [0, 0],
  the: [14, 14],
  cafe: [-14, -14],
  'choix-the': [72, 72],
  'choix-cafe': [-72, -72],
  'balayage-the': [225, 72],
  'balayage-cafe': [-72, 85],
};

const INCLINAISON = 12;
const INCLINAISON_MOBILE = 6;
const attendre = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const reduireLesAnimations = () =>
  globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? true;
const estMobile = () => globalThis.matchMedia?.('(max-width: 700px)').matches ?? false;

/**
 * Écran d'intro « plutôt thé ou plutôt café ? », au premier passage sur l'accueil
 * de la session (maquette HTML).
 *
 * Chaque côté est un volet incliné qu'on fait glisser ; son contenu fait le
 * mouvement inverse pour rester immobile. Tout passe par `transform` : fluide.
 * Bâti sur `<dialog>` : focus piégé, arrière-plan inerte, Échap pour passer.
 */
@Component({
  selector: 'app-home-intro',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HomeIntroPanel],
  templateUrl: './home-intro.html',
  styleUrl: './home-intro.scss',
  host: { '(window:resize)': 'suivreTaille()' },
})
export class HomeIntro {
  private readonly store = inject(SideStore);
  private readonly appRef = inject(ApplicationRef);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  protected readonly cotes: readonly Side[] = ['the', 'cafe'];
  protected readonly etat = signal<Etat>('repos');
  protected readonly survol = signal<Side | null>(null);
  protected readonly choisi = signal<Side | null>(null);
  protected readonly balayage = signal(false);
  protected readonly duree = signal('0.9s');
  protected readonly courbe = signal('cubic-bezier(.22,1,.36,1)');
  protected readonly mobile = signal(estMobile());
  private occupe = false;

  /** Transformations des volets et de leur contenu, pour l'étape en cours. */
  protected readonly volets = computed(() => {
    const [the, cafe] = POSITIONS[this.etat()];
    const transformer = (v: number) =>
      this.mobile()
        ? {
            volet: `translateY(${v}vh) skewY(${INCLINAISON_MOBILE}deg)`,
            contenu: `skewY(${-INCLINAISON_MOBILE}deg) translateY(${-v}vh)`,
          }
        : {
            volet: `translateX(${v}vw) skewX(${-INCLINAISON}deg)`,
            contenu: `skewX(${INCLINAISON}deg) translateX(${-v}vw)`,
          };
    return { the: transformer(the), cafe: transformer(cafe) };
  });

  constructor() {
    const corps = globalThis.document?.body;
    afterNextRender(() => {
      this.dialog().nativeElement.showModal();
      if (corps) corps.style.overflow = 'hidden';
    });
    inject(DestroyRef).onDestroy(() => {
      if (corps) corps.style.overflow = '';
    });
  }

  protected suivreTaille(): void {
    this.mobile.set(estMobile());
  }

  protected survoler(side: Side | null): void {
    if (this.occupe) return;
    this.duree.set('0.9s');
    this.courbe.set('cubic-bezier(.22,1,.36,1)');
    this.survol.set(side);
    this.etat.set(side ?? 'repos');
  }

  protected async choisir(side: Side): Promise<void> {
    if (this.occupe) return;
    this.occupe = true;
    if (reduireLesAnimations()) return this.entrer(side);

    // 1. Le côté choisi passe devant et s'étend jusqu'à couvrir l'écran.
    this.choisi.set(side);
    this.duree.set('1s');
    this.courbe.set('cubic-bezier(.65,0,.2,1)');
    this.etat.set(`choix-${side}`);
    await attendre(1000);

    // 2. Son bord file vers le côté : le grand « BRUME » apparaît.
    this.balayage.set(true);
    this.duree.set('1.15s');
    this.courbe.set('cubic-bezier(.7,0,.2,1)');
    this.etat.set(`balayage-${side}`);
    await attendre(1350);

    // 3. « BRUME » rejoint le logo du menu, le site apparaît.
    return this.entrer(side);
  }

  protected passer(evenement?: Event): void {
    evenement?.preventDefault(); // Échap : on gère la fermeture nous-mêmes.
    if (this.occupe) return;
    this.occupe = true;
    void this.entrer(null);
  }

  private async entrer(side: Side | null): Promise<void> {
    const html = globalThis.document?.documentElement;
    await avecTransitionDeVue(
      'transition-intro',
      () => {
        html?.classList.add('intro-arrivee');
        if (side !== null) this.store.choose(side);
        this.store.markIntroSeen(); // retire l'intro de la page
      },
      () => this.appRef.tick(),
    );
    html?.classList.remove('intro-arrivee');
  }
}

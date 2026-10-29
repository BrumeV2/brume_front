import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  viewChild,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, map, of, startWith, switchMap } from 'rxjs';

import { HomeService, type HomeShowcase } from '../../../../core/api/home.service';
import { SideStore } from '../../../../core/state/side.store';
import { RevealDirective } from '../../../../shared/directives/reveal.directive';
import { UiButton } from '../../../../shared/ui/ui-button/ui-button';
import { HomeAdvent } from '../../components/home-advent/home-advent';
import { HomeBattle } from '../../components/home-battle/home-battle';
import { HomeBlendPreview } from '../../components/home-blend-preview/home-blend-preview';
import { HomeFavorites } from '../../components/home-favorites/home-favorites';
import { HomeFeature } from '../../components/home-feature/home-feature';
import { HomeHero } from '../../components/home-hero/home-hero';
import { HomeIntro } from '../../components/home-intro/home-intro';
import { HomeJournal } from '../../components/home-journal/home-journal';
import { HomeManifesto } from '../../components/home-manifesto/home-manifesto';
import { HomeMoments } from '../../components/home-moments/home-moments';
import { HomeTicker } from '../../components/home-ticker/home-ticker';
import { HomeUniverses } from '../../components/home-universes/home-universes';

type EtatVitrine =
  | { readonly statut: 'chargement' }
  | { readonly statut: 'erreur' }
  | { readonly statut: 'pret'; readonly vitrine: HomeShowcase };

/**
 * Page d'accueil (ADD-094), d'après la maquette Figma « Accueil », animée comme
 * la maquette HTML. Le côté thé / café choisi réordonne et remplit la vitrine.
 *
 * Les sections des fonctions pas encore livrées (TeaOMatic, TEA-BOX, Bataille,
 * calendrier, journal, carte cadeau) présentent l'offre sans aucun lien.
 */
@Component({
  selector: 'app-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    RevealDirective,
    UiButton,
    HomeAdvent,
    HomeBattle,
    HomeBlendPreview,
    HomeFavorites,
    HomeFeature,
    HomeHero,
    HomeIntro,
    HomeJournal,
    HomeManifesto,
    HomeMoments,
    HomeTicker,
    HomeUniverses,
  ],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  private readonly store = inject(SideStore);
  private readonly homeService = inject(HomeService);
  private readonly moments = viewChild.required<ElementRef<HTMLElement>>('moments');

  protected readonly side = this.store.side;
  protected readonly introVisible = computed(() => !this.store.introSeen());

  /** Vitrine du côté choisi. En changeant de côté, l'ancienne reste affichée jusqu'à la nouvelle. */
  protected readonly vitrine = toSignal(
    toObservable(this.side).pipe(
      switchMap((side) =>
        this.homeService.getShowcase(side).pipe(
          map((vitrine): EtatVitrine => ({ statut: 'pret', vitrine })),
          catchError(() => of<EtatVitrine>({ statut: 'erreur' })),
        ),
      ),
      startWith<EtatVitrine>({ statut: 'chargement' }),
    ),
    { requireSync: true },
  );

  protected readonly showcase = computed(() => {
    const etat = this.vitrine();
    return etat.statut === 'pret' ? etat.vitrine : null;
  });
  protected readonly enErreur = computed(() => this.vitrine().statut === 'erreur');

  protected descendre(): void {
    this.moments().nativeElement.scrollIntoView({ behavior: 'smooth' });
  }
}

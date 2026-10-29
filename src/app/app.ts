import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRouteSnapshot, Data, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';

import { SiteFooter } from './layout/site-footer/site-footer';
import { SiteHeader } from './layout/site-header/site-header';

/**
 * Données de route lues par le cadre commun :
 * - `menu: 'transparent'` : la page commence par une photo ou un bandeau sombre,
 *   le menu se pose dessus au lieu de la décaler ;
 * - `piedDePage: false` : écran plein (connexion, inscription), sans pied de page.
 */
export interface DonneesCadre {
  readonly menu?: 'transparent';
  readonly piedDePage?: boolean;
}

/** Fusionne les données de la route racine jusqu'à la page affichée. */
function donneesDe(racine: ActivatedRouteSnapshot): Data {
  let route: ActivatedRouteSnapshot | null = racine;
  let donnees: Data = {};
  while (route !== null) {
    donnees = { ...donnees, ...route.data };
    route = route.firstChild;
  }
  return donnees;
}

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, SiteHeader, SiteFooter],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly router = inject(Router);
  private readonly contenu = viewChild.required<ElementRef<HTMLElement>>('contenu');

  private readonly donnees = toSignal(
    this.router.events.pipe(
      filter((evenement) => evenement instanceof NavigationEnd),
      map((_, index) => {
        // Après une navigation (pas au premier affichage), le focus clavier
        // repart du début du contenu, comme lors d'un chargement de page.
        if (index > 0) this.contenu().nativeElement.focus({ preventScroll: true });
        return donneesDe(this.router.routerState.snapshot.root) as DonneesCadre;
      }),
    ),
    { initialValue: {} as DonneesCadre },
  );

  protected readonly menuTransparent = computed(() => this.donnees().menu === 'transparent');
  protected readonly piedDePage = computed(() => this.donnees().piedDePage !== false);
}

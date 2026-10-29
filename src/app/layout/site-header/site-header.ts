import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  IsActiveMatchOptions,
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
} from '@angular/router';
import { filter } from 'rxjs';

import { COMPTE, UNIVERS } from '../navigation';
import { SideSwitch } from '../side-switch/side-switch';

/** Au-delà de ce défilement, le menu transparent devient plein (description Figma). */
const SEUIL_DEFILEMENT = 24;

/**
 * « Menu / Ordinateur » et « Menu / Mobile » de la maquette.
 *
 * - `transparent` : posé sur une grande photo ou un bandeau sombre, il devient
 *   plein dès qu'on fait défiler ;
 * - sur mobile, les liens passent dans un panneau `<dialog>` : piège du focus,
 *   Échap et arrière-plan inerte sont gérés par le navigateur.
 */
@Component({
  selector: 'app-site-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, SideSwitch],
  templateUrl: './site-header.html',
  styleUrl: './site-header.scss',
  host: {
    '[class.est-plein]': 'estPlein()',
    '(window:scroll)': 'suivreDefilement()',
  },
})
export class SiteHeader {
  /** Vrai sur les pages à grande photo ou bandeau sombre en haut. */
  readonly transparent = input(false);

  protected readonly univers = UNIVERS;
  protected readonly compte = COMPTE;
  /** Un univers est actif sur son filtre, quels que soient les autres filtres posés. */
  protected readonly correspondanceUnivers: IsActiveMatchOptions = {
    paths: 'exact',
    queryParams: 'subset',
    fragment: 'ignored',
    matrixParams: 'ignored',
  };

  private readonly aDefile = signal(false);
  protected readonly estPlein = computed(() => !this.transparent() || this.aDefile());

  private readonly panneau = viewChild.required<ElementRef<HTMLDialogElement>>('panneau');

  constructor() {
    // Une navigation depuis le panneau le referme.
    inject(Router)
      .events.pipe(
        filter((evenement) => evenement instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.fermerMenu());
  }

  protected suivreDefilement(): void {
    const aDefile = window.scrollY > SEUIL_DEFILEMENT;
    if (aDefile !== this.aDefile()) this.aDefile.set(aDefile);
  }

  protected ouvrirMenu(): void {
    const dialog = this.panneau().nativeElement;
    if (!dialog.open) dialog.showModal();
  }

  protected fermerMenu(): void {
    const dialog = this.panneau().nativeElement;
    if (dialog.open) dialog.close();
  }
}

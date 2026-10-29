import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { UiChip } from '../../../../shared/ui/ui-chip/ui-chip';

interface Onglet {
  readonly id: string;
  readonly libelle: string;
  readonly lien: string | null;
}

/** Onglets des pages du compte (« Onglets » de la maquette), partagés par « Mon compte » et « Mon profil ». */
@Component({
  selector: 'app-account-tabs',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, UiChip],
  templateUrl: './account-tabs.html',
  styleUrl: './account-tabs.scss',
})
export class AccountTabs {
  /** Onglet de la page affichée, aucun sur la vue d'ensemble « Mon compte ». */
  readonly actif = input<string | null>(null);

  protected readonly onglets: readonly Onglet[] = [
    { id: 'commandes', libelle: 'Commandes', lien: null },
    { id: 'tea-box', libelle: 'TEA-BOX', lien: null },
    { id: 'creations', libelle: 'Mes créations', lien: null },
    { id: 'bataille', libelle: 'Bataille', lien: null },
    { id: 'profil', libelle: 'Profil', lien: '/compte/profil' },
  ];
}

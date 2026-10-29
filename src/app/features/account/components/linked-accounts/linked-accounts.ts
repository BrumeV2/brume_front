import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { UiCard } from '../../../../shared/ui/ui-card/ui-card';
import { LogoutButton } from '../logout-button/logout-button';

/**
 * Carte « Connexion » de « Mon profil » : le compte Google relié et la déconnexion.
 * Google est le seul fournisseur d'identité de Brume.
 */
@Component({
  selector: 'app-linked-accounts',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UiCard, LogoutButton],
  templateUrl: './linked-accounts.html',
  styleUrl: './linked-accounts.scss',
})
export class LinkedAccounts {
  readonly email = input.required<string>();
}

import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { UiCard } from '../../../../shared/ui/ui-card/ui-card';
import { LogoutButton } from '../logout-button/logout-button';

/**
 * Carte de connexion sans présumer du fournisseur utilisé par le compte.
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

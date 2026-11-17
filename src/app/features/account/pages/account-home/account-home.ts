import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { AuthStore } from '../../../../core/auth/auth.store';
import { AccountTabs } from '../../components/account-tabs/account-tabs';
import { LogoutButton } from '../../components/logout-button/logout-button';

/**
 * « Mon compte » : point d'arrivée après Google (AUTH_SUCCESS_URL côté API).
 *
 * Seul le bandeau de la maquette est en place, avec la déconnexion (ADD-087).
 * Chiffres, commandes et TEA-BOX viendront avec leurs stories.
 */
@Component({
  selector: 'app-account-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AccountTabs, LogoutButton],
  templateUrl: './account-home.html',
  styleUrl: './account-home.scss',
})
export class AccountHome {
  // La garde de la route a déjà chargé le profil dans le store.
  protected readonly user = inject(AuthStore).user;

  protected readonly initiales = computed(() => {
    const user = this.user();
    if (user === null) {
      return '';
    }
    // Le contrat laisse prénom et nom à `null` : reste l'email.
    const lettres = `${user.firstName?.charAt(0) ?? ''}${user.lastName?.charAt(0) ?? ''}`;
    return (lettres === '' ? user.email.charAt(0) : lettres).toUpperCase();
  });

  /** « Bonjour » puis « Camille. » ; « Bonjour. » seul si Google n'a pas fourni de prénom. */
  protected readonly salutation = computed(() => {
    const prenom = this.user()?.firstName?.trim() ?? '';
    return prenom === ''
      ? { ligne: 'Bonjour.', prenom: null }
      : { ligne: 'Bonjour', prenom: `${prenom}.` };
  });
}

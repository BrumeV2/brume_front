import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../../../../core/auth/auth.service';

/**
 * Bouton « Se déconnecter » de la maquette (ADD-087), présent dans le bandeau de
 * « Mon compte » et dans la carte « Connexion » de « Mon profil ».
 *
 * Ce composant porte l'action complète, pour qu'elle se comporte de la même façon
 * aux deux endroits : révocation de la session, retour vers la connexion, et
 * message d'erreur si l'API n'a pas confirmé.
 */
@Component({
  selector: 'app-logout-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './logout-button.html',
  styleUrl: './logout-button.scss',
  host: { '[class.sur-fond-sombre]': "fond() === 'sombre'" },
})
export class LogoutButton {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /** Fond sur lequel le bouton est posé : contour clair sur le bandeau encre, foncé sinon. */
  readonly fond = input<'sombre' | 'clair'>('clair');

  protected readonly isPending = signal(false);
  protected readonly hasFailed = signal(false);

  protected readonly iconSrc = computed(() =>
    this.fond() === 'sombre' ? 'icons/deconnexion-claire.svg' : 'icons/deconnexion-foncee.svg',
  );
  protected readonly libelle = computed(() =>
    this.isPending() ? 'Déconnexion…' : 'Se déconnecter',
  );

  protected async logout(): Promise<void> {
    if (this.isPending()) return;
    this.isPending.set(true);
    this.hasFailed.set(false);

    try {
      await this.auth.logout();
    } catch {
      // Sans confirmation de l'API, la session existe peut-être encore : on reste
      // ici, connecté, et on le dit.
      this.hasFailed.set(true);
      this.isPending.set(false);
      return;
    }

    // `replaceUrl` : un retour arrière ne doit pas ramener sur une page privée.
    await this.router.navigateByUrl('/connexion', { replaceUrl: true });
    this.isPending.set(false);
  }
}

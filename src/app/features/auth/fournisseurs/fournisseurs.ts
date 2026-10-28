import { Component, computed, inject, input, signal } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';

/**
 * Bouton « Continuer avec Google » (connexion) / « S'inscrire avec Google » (inscription).
 *
 * Simple lien vers l'API, qui gère tout le parcours OAuth (state, PKCE, nonce)
 * puis redirige vers /compte avec le cookie de session posé.
 * La maquette prévoit aussi Apple, retiré tant que l'API ne le propose pas.
 */
@Component({
  selector: 'app-fournisseurs',
  templateUrl: './fournisseurs.html',
  styleUrl: './fournisseurs.scss',
  host: {
    '[class.sombre]': "theme() === 'sombre'",
    // Retour arrière depuis Google : la page sort du cache, le bouton doit redevenir normal.
    '(window:pageshow)': 'redirection.set(false)',
  },
})
export class Fournisseurs {
  readonly action = input.required<'connexion' | 'inscription'>();
  readonly theme = input<'sombre' | 'clair'>('clair');

  protected readonly googleUrl = inject(AuthService).googleLoginUrl;
  protected readonly redirection = signal(false);

  protected readonly libelle = computed(() =>
    this.action() === 'connexion' ? 'Continuer avec Google' : 'S’inscrire avec Google',
  );
}

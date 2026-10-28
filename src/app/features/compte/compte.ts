import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

/**
 * Point d'arrivée après Google (AUTH_SUCCESS_URL côté API).
 * Version minimale : la maquette « Mon compte » complète viendra avec la story profil.
 */
@Component({
  selector: 'app-compte',
  templateUrl: './compte.html',
  styleUrl: './compte.scss',
})
export class Compte {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly user = this.auth.user;
  protected readonly enCours = signal(false);
  protected readonly erreur = signal(false);

  protected async deconnecter(): Promise<void> {
    this.enCours.set(true);
    this.erreur.set(false);
    try {
      await this.auth.logout();
      await this.router.navigate(['/connexion']);
    } catch {
      // Sans 204, rien ne prouve que la session est révoquée : on reste ici.
      this.erreur.set(true);
    } finally {
      this.enCours.set(false);
    }
  }
}

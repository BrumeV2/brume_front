import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { RouterLink } from '@angular/router';
import { Fournisseurs } from '../fournisseurs/fournisseurs';

import { AuthApiService } from '../../../core/api/auth-api.service';
import { toApiError, type ApiError } from '../../../core/api/api-error';
import { UiField } from '../../../shared/ui/ui-field/ui-field';
import { UiButton } from '../../../shared/ui/ui-button/ui-button';
import {
  authErrorMessage,
  emailControl,
  passwordControl,
  fieldError,
  PASSWORD_HELP,
} from '../auth-form';

/**
 * Maquette « Inscription — ordinateur / mobile ».
 * Inscription email avec confirmation, ou parcours Google existant.
 */
@Component({
  selector: 'app-inscription',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Fournisseurs, ReactiveFormsModule, UiField, UiButton],
  templateUrl: './inscription.html',
  styleUrl: './inscription.scss',
})
export class Inscription {
  private readonly api = inject(AuthApiService);
  protected readonly form = new FormGroup({
    email: emailControl(),
    password: passwordControl(true),
  });
  protected readonly occupe = signal(false);
  protected readonly accepte = signal(false);
  protected readonly erreur = signal<ApiError | null>(null);
  protected readonly message = computed(() =>
    this.erreur() ? authErrorMessage(this.erreur()!) : '',
  );
  protected readonly aideMotDePasse = PASSWORD_HELP;
  protected erreurChamp(champ: 'email' | 'password'): string | null {
    return fieldError(this.form.controls[champ], champ, this.erreur());
  }
  protected async inscrire(): Promise<void> {
    if (this.occupe()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.occupe.set(true);
    this.erreur.set(null);
    try {
      await firstValueFrom(this.api.register(this.form.getRawValue()));
      this.form.controls.password.reset();
      this.accepte.set(true);
    } catch (error) {
      this.erreur.set(toApiError(error));
    } finally {
      this.occupe.set(false);
    }
  }

  protected readonly univers = [
    { nom: 'Thé', detail: '25 références', src: 'images/auth/univers-the.jpg' },
    { nom: 'Café', detail: 'torréfié le mardi', src: 'images/auth/bresil-cerrado.jpg' },
    { nom: 'CBD', detail: 'chanvre de la Sarthe', src: 'images/auth/sencha-chanvre.jpg' },
  ];

  protected readonly avantages = [
    { titre: 'Livraison offerte', detail: 'dès 40 €' },
    { titre: 'Tes mélanges', detail: 'enregistrés' },
    { titre: 'La Bataille', detail: 'tu votes' },
  ];
}

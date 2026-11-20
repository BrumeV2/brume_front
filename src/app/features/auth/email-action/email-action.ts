import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { AuthApiService } from '../../../core/api/auth-api.service';
import { toApiError, type ApiError } from '../../../core/api/api-error';
import { AuthService } from '../../../core/auth/auth.service';
import { UiButton } from '../../../shared/ui/ui-button/ui-button';
import { UiField } from '../../../shared/ui/ui-field/ui-field';
import {
  authErrorMessage,
  emailControl,
  passwordControl,
  fieldError,
  EMAIL_ACCEPTED,
  INVALID_LINK,
  PASSWORD_HELP,
} from '../auth-form';

type Mode = 'confirm' | 'reset' | 'forgot' | 'resend';
const TITRES: Record<Mode, string> = {
  confirm: 'Confirmer ton adresse email',
  reset: 'Choisir un nouveau mot de passe',
  forgot: 'Mot de passe oublié',
  resend: 'Renvoyer la confirmation',
};

@Component({
  selector: 'app-email-action',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, UiField, UiButton],
  templateUrl: './email-action.html',
  styleUrl: './email-action.scss',
})
export class EmailAction {
  readonly mode = input.required<Mode>();
  private readonly api = inject(AuthApiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly token: string | null;

  protected readonly titre = computed(() => TITRES[this.mode()]);
  protected readonly email = emailControl();
  protected readonly password = passwordControl(true);
  protected readonly formEmail = new FormGroup({ email: this.email });
  protected readonly formPassword = new FormGroup({ password: this.password });
  protected readonly occupe = signal(false);
  protected readonly termine = signal(false);
  protected readonly erreur = signal<ApiError | null>(null);
  protected readonly message = computed(() =>
    this.erreur() ? authErrorMessage(this.erreur()!) : '',
  );
  protected readonly avisEmail = EMAIL_ACCEPTED;
  protected readonly aideMotDePasse = PASSWORD_HELP;
  protected readonly lienInvalide = INVALID_LINK;
  protected readonly lienValide: boolean;

  constructor() {
    const fragment = inject(ActivatedRoute).snapshot.fragment;
    const params = new URLSearchParams(fragment ?? '');
    const candidat = params.get('token');
    this.token =
      candidat && /^[A-Za-z0-9_-]{43}$/.test(candidat) && params.getAll('token').length === 1
        ? candidat
        : null;
    this.lienValide = this.token !== null;
    // Immédiat, sans navigation réseau et avant toute action de confirmation.
    // Aucun jeton n'est conservé dans les query params, le stockage ou le DOM.
    if (fragment !== null) inject(Location).replaceState(this.router.url.split('#')[0]);
  }

  protected erreurChamp(champ: 'email' | 'password'): string | null {
    return fieldError(champ === 'email' ? this.email : this.password, champ, this.erreur());
  }
  protected async envoyer(): Promise<void> {
    if (this.occupe() || this.termine()) return;
    const mode = this.mode();
    if ((mode === 'confirm' || mode === 'reset') && !this.token) return;
    if (mode === 'forgot' || mode === 'resend') {
      this.email.markAsTouched();
      if (this.email.invalid) return;
    }
    if (mode === 'reset') {
      this.password.markAsTouched();
      if (this.password.invalid) return;
    }
    this.occupe.set(true);
    this.erreur.set(null);
    try {
      switch (mode) {
        case 'confirm':
          await firstValueFrom(this.api.confirmEmail({ token: this.token! }));
          break;
        case 'reset':
          await firstValueFrom(
            this.api.resetPassword({ token: this.token!, password: this.password.value }),
          );
          this.password.reset();
          this.auth.forgetSession();
          await this.router.navigate(['/connexion'], {
            queryParams: { reset: 'success' },
            replaceUrl: true,
          });
          return;
        case 'forgot':
          await firstValueFrom(this.api.forgotPassword({ email: this.email.value }));
          break;
        case 'resend':
          await firstValueFrom(this.api.resendConfirmation({ email: this.email.value }));
          break;
      }
      this.termine.set(true);
    } catch (error) {
      this.erreur.set(toApiError(error));
    } finally {
      this.occupe.set(false);
    }
  }
}

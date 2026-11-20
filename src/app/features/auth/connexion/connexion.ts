import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Fournisseurs } from '../fournisseurs/fournisseurs';

import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { AuthApiService } from '../../../core/api/auth-api.service';
import { toApiError, type ApiError } from '../../../core/api/api-error';
import { UiField } from '../../../shared/ui/ui-field/ui-field';
import { UiButton } from '../../../shared/ui/ui-button/ui-button';
import {
  authErrorMessage,
  emailControl,
  passwordControl,
  fieldError,
  EMAIL_ACCEPTED,
} from '../auth-form';

const photo = (nom: string) => `images/auth/${nom}.jpg`;

/** Maquette « Connexion — ordinateur / mobile ». */
@Component({
  selector: 'app-connexion',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Fournisseurs, ReactiveFormsModule, UiField, UiButton],
  templateUrl: './connexion.html',
  styleUrl: './connexion.scss',
})
export class Connexion {
  private readonly auth = inject(AuthService);
  private readonly api = inject(AuthApiService);
  private readonly router = inject(Router);
  protected readonly sessionExpiree =
    inject(ActivatedRoute).snapshot.queryParamMap.get('session') === 'expired';
  protected readonly reinitialise =
    inject(ActivatedRoute).snapshot.queryParamMap.get('reset') === 'success';
  protected readonly form = new FormGroup({
    email: emailControl(),
    password: passwordControl(false),
  });
  protected readonly occupe = signal(false);
  protected readonly erreur = signal<ApiError | null>(null);
  protected readonly avis = signal('');
  protected readonly message = computed(() =>
    this.erreur() ? authErrorMessage(this.erreur()!) : '',
  );
  protected erreurChamp(champ: 'email' | 'password'): string | null {
    return fieldError(this.form.controls[champ], champ, this.erreur());
  }
  protected async connecter(): Promise<void> {
    if (this.occupe()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.occupe.set(true);
    this.erreur.set(null);
    this.avis.set('');
    try {
      await this.auth.login(this.form.getRawValue());
      this.form.controls.password.reset();
      await this.router.navigateByUrl('/compte');
    } catch (error) {
      this.erreur.set(toApiError(error));
    } finally {
      this.occupe.set(false);
    }
  }
  protected async renvoyer(): Promise<void> {
    if (this.occupe() || this.form.controls.email.invalid) return;
    this.occupe.set(true);
    try {
      await firstValueFrom(this.api.resendConfirmation({ email: this.form.controls.email.value }));
      this.avis.set(EMAIL_ACCEPTED);
      this.erreur.set(null);
    } catch (error) {
      this.erreur.set(toApiError(error));
    } finally {
      this.occupe.set(false);
    }
  }

  // Mosaïque ordinateur : trois colonnes en quinconce. Les proportions des
  // hauteurs sont dans connexion.scss (la mosaïque suit la hauteur de l'écran).
  protected readonly colonnes = [
    [
      { src: photo('matcha-ceremonie'), etiquette: 'Thé · Uji' },
      { src: photo('rose') },
      { src: photo('cacao') },
    ],
    [
      { src: photo('bresil-cerrado'), etiquette: 'Café · Cerrado' },
      { src: photo('ethiopie-yirgacheffe') },
      { src: photo('cardamome') },
    ],
    [
      { src: photo('sencha-chanvre'), etiquette: 'Chanvre · Sarthe' },
      { src: photo('jasmin-perles') },
      { src: photo('oolong-lait') },
    ],
  ];

  // Mosaïque mobile : cinq photos placées librement (en % d'un cadre 370 × 360).
  protected readonly mosaiqueMobile = [
    { src: photo('matcha-ceremonie'), x: 0, y: 0, l: 170, h: 200 },
    { src: photo('bresil-cerrado'), x: 180, y: 40, l: 190, h: 170 },
    { src: photo('sencha-chanvre'), x: 0, y: 210, l: 120, h: 150 },
    { src: photo('cannelle'), x: 130, y: 220, l: 110, h: 110 },
    { src: photo('rose'), x: 250, y: 220, l: 120, h: 140 },
  ];

  protected readonly avantages = [
    { src: photo('box-selection'), libelle: 'Tes commandes' },
    { src: photo('box-custom'), libelle: 'Ta TEA-BOX' },
    { src: photo('matin-dore'), libelle: 'Tes mélanges' },
    { src: photo('box-tournoi'), libelle: 'Ton vote' },
  ];

  protected pourcent(valeur: number, total: number): string {
    return `${(valeur / total) * 100}%`;
  }
}

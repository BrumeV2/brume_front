import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';

import { toApiError, type ApiError } from '../../../../core/api/api-error';
import type { UpdateProfileDraft, UserProfile } from '../../../../core/api/api.types';
import { PROFILE_RULES } from '../../../../core/api/profile-rules';
import { UsersService } from '../../../../core/api/users.service';
import { AuthStore } from '../../../../core/auth/auth.store';
import { UiButton } from '../../../../shared/ui/ui-button/ui-button';
import { UiCard } from '../../../../shared/ui/ui-card/ui-card';
import { UiField } from '../../../../shared/ui/ui-field/ui-field';
import { UiStaticField } from '../../../../shared/ui/ui-static-field/ui-static-field';
import { AccountTabs } from '../../components/account-tabs/account-tabs';
import { LinkedAccounts } from '../../components/linked-accounts/linked-accounts';

/** Les champs que cet écran peut modifier. */
type ChampProfil = 'firstName' | 'lastName' | 'birthDate';

interface ValeursProfil {
  readonly firstName: string;
  readonly lastName: string;
  readonly birthDate: string;
}

const MOIS_ANNEE = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' });

const MESSAGES_SERVEUR: Record<ChampProfil, string> = {
  firstName: "Ce prénom n'a pas été accepté. Vérifie qu'il est renseigné et pas trop long.",
  lastName: "Ce nom n'a pas été accepté. Vérifie qu'il est renseigné et pas trop long.",
  birthDate: "Cette date n'a pas été acceptée. Elle doit être valide et dans le passé.",
};

/** Un champ facultatif vide vaut `null`, comme attendu par l'API. */
function normaliser(valeur: string): string | null {
  const nettoye = valeur.trim();
  return nettoye === '' ? null : nettoye;
}

/**
 * Refuse une valeur vide ou faite uniquement d'espaces.
 *
 * `Validators.required` laisse passer « &nbsp;&nbsp; », qui partirait vide vers l'API après
 * nettoyage : on vérifie donc la valeur une fois les espaces retirés.
 */
function texteObligatoire(control: AbstractControl<string>): ValidationErrors | null {
  return control.value.trim() === '' ? { required: true } : null;
}

/** Refuse une date mal formée ou postérieure à aujourd'hui. */
function dateDeNaissanceValide(control: AbstractControl<string>): ValidationErrors | null {
  const valeur = control.value.trim();
  if (valeur === '') {
    return null;
  }
  if (!PROFILE_RULES.birthDate.pattern.test(valeur)) {
    return { formatDate: true };
  }
  const date = new Date(`${valeur}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    return { formatDate: true };
  }
  return date.getTime() > Date.now() ? { dateFuture: true } : null;
}

@Component({
  selector: 'app-profile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    UiButton,
    UiCard,
    UiField,
    UiStaticField,
    AccountTabs,
    LinkedAccounts,
  ],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile {
  private readonly usersService = inject(UsersService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly authStore = inject(AuthStore);

  protected readonly form = new FormGroup({
    firstName: new FormControl('', {
      nonNullable: true,
      validators: [texteObligatoire, Validators.maxLength(PROFILE_RULES.firstName.maxLength)],
    }),
    lastName: new FormControl('', {
      nonNullable: true,
      validators: [texteObligatoire, Validators.maxLength(PROFILE_RULES.lastName.maxLength)],
    }),
    birthDate: new FormControl('', { nonNullable: true, validators: [dateDeNaissanceValide] }),
  });

  /** Valeurs saisies, suivies en signal pour alimenter les `computed` du gabarit. */
  private readonly valeurs = signal<ValeursProfil>(this.form.getRawValue());

  protected readonly profil = this.authStore.user;
  protected readonly statut = this.authStore.status;
  protected readonly erreurChargement = this.authStore.error;

  protected readonly enregistrement = signal(false);
  protected readonly erreurEnregistrement = signal<ApiError | null>(null);
  protected readonly confirmation = signal(false);
  /** Vrai après une tentative d'envoi : avant, on n'affiche pas d'erreur de saisie. */
  protected readonly soumis = signal(false);

  protected readonly initiales = computed(() => {
    const profil = this.profil();
    if (profil === null) {
      return '';
    }
    return `${profil.firstName.charAt(0)}${profil.lastName.charAt(0)}`.toUpperCase();
  });

  protected readonly nomComplet = computed(() => {
    const profil = this.profil();
    return profil === null ? '' : `${profil.firstName} ${profil.lastName}`;
  });

  protected readonly depuis = computed(() => {
    const profil = this.profil();
    if (profil === null) {
      return '';
    }
    const date = new Date(profil.createdAt);
    return Number.isNaN(date.getTime()) ? '' : MOIS_ANNEE.format(date);
  });

  /** Champs dont la valeur saisie diffère du profil enregistré. */
  protected readonly champsModifies = computed<readonly ChampProfil[]>(() => {
    const enregistre = this.profil();
    if (enregistre === null) {
      return [];
    }
    const saisi = this.valeurs();
    const modifies: ChampProfil[] = [];

    if (saisi.firstName.trim() !== enregistre.firstName) {
      modifies.push('firstName');
    }
    if (saisi.lastName.trim() !== enregistre.lastName) {
      modifies.push('lastName');
    }
    if (normaliser(saisi.birthDate) !== enregistre.birthDate) {
      modifies.push('birthDate');
    }
    return modifies;
  });

  protected readonly aDesModifications = computed(() => this.champsModifies().length > 0);

  protected readonly libelleModifications = computed(() => {
    const nombre = this.champsModifies().length;
    return nombre === 1
      ? '1 modification non enregistrée'
      : `${nombre} modifications non enregistrées`;
  });

  constructor() {
    if (this.authStore.status() === 'idle') {
      this.authStore.load();
    }

    // Le formulaire suit le profil : au chargement, puis après chaque enregistrement.
    effect(() => {
      const profil = this.profil();
      if (profil !== null) {
        this.remplirDepuis(profil);
      }
    });

    // Une saisie efface le message du serveur et la confirmation précédente.
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.valeurs.set(this.form.getRawValue());
      this.erreurEnregistrement.set(null);
      this.confirmation.set(false);
    });
  }

  /** Message sous un champ : refus du serveur d'abord, puis validation locale. */
  protected erreurDuChamp(champ: ChampProfil): string | null {
    const duServeur = this.erreurEnregistrement()?.fieldErrors[champ];
    if (duServeur !== undefined && duServeur.length > 0) {
      return MESSAGES_SERVEUR[champ];
    }

    const control = this.form.controls[champ];
    if (!this.soumis() && !control.touched) {
      return null;
    }

    const erreurs = control.errors;
    if (erreurs === null) {
      return null;
    }
    if (erreurs['required'] !== undefined) {
      return 'Ce champ est obligatoire.';
    }
    if (erreurs['maxlength'] !== undefined) {
      return `${PROFILE_RULES.firstName.maxLength} caractères au maximum.`;
    }
    if (erreurs['dateFuture'] !== undefined) {
      return 'Cette date est dans le futur.';
    }
    if (erreurs['formatDate'] !== undefined) {
      return 'Cette date est invalide.';
    }
    return 'Cette valeur est invalide.';
  }

  protected reessayerChargement(): void {
    this.authStore.load();
  }

  protected annuler(): void {
    const enregistre = this.profil();
    if (enregistre !== null) {
      this.remplirDepuis(enregistre);
    }
    this.soumis.set(false);
    this.erreurEnregistrement.set(null);
    this.confirmation.set(false);
  }

  protected enregistrer(): void {
    this.soumis.set(true);
    this.confirmation.set(false);

    if (this.form.invalid || !this.aDesModifications() || this.enregistrement()) {
      return;
    }

    const saisi = this.form.getRawValue();
    const modifies = this.champsModifies();

    // PATCH partiel : on n'envoie que ce qui a changé (`minProperties: 1` du contrat).
    const corps: UpdateProfileDraft = {
      ...(modifies.includes('firstName') ? { firstName: saisi.firstName.trim() } : {}),
      ...(modifies.includes('lastName') ? { lastName: saisi.lastName.trim() } : {}),
      ...(modifies.includes('birthDate') ? { birthDate: normaliser(saisi.birthDate) } : {}),
    };

    this.enregistrement.set(true);
    this.erreurEnregistrement.set(null);

    this.usersService
      .updateMe(corps)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (profil) => {
          this.enregistrement.set(false);
          this.soumis.set(false);
          // Met à jour le store, qui réalimente le formulaire par l'effet.
          this.authStore.setUser(profil);
          this.confirmation.set(true);
        },
        error: (erreur: unknown) => {
          this.enregistrement.set(false);
          // Les saisies ne sont pas remises à zéro : l'utilisateur garde ses corrections.
          this.erreurEnregistrement.set(toApiError(erreur));
        },
      });
  }

  private remplirDepuis(profil: UserProfile): void {
    this.form.setValue(
      {
        firstName: profil.firstName,
        lastName: profil.lastName,
        birthDate: profil.birthDate ?? '',
      },
      { emitEvent: false },
    );
    this.valeurs.set(this.form.getRawValue());
  }
}

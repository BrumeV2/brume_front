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
  ValidatorFn,
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
import { UiSwitch } from '../../../../shared/ui/ui-switch/ui-switch';
import { AccountTabs } from '../../components/account-tabs/account-tabs';
import { LinkedAccounts } from '../../components/linked-accounts/linked-accounts';

/** Les champs que cet écran peut modifier : exactement `UpdateProfileRequest`. */
type ChampProfil =
  'firstName' | 'lastName' | 'phone' | 'address' | 'postalCode' | 'city' | 'doNewsletter';

interface ValeursProfil {
  readonly firstName: string;
  readonly lastName: string;
  readonly phone: string;
  readonly address: string;
  readonly postalCode: string;
  readonly city: string;
  readonly doNewsletter: boolean;
}

const MOIS_ANNEE = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' });

const MESSAGES_SERVEUR: Record<ChampProfil, string> = {
  firstName: "Ce prénom n'a pas été accepté. Vérifie qu'il est renseigné et pas trop long.",
  lastName: "Ce nom n'a pas été accepté. Vérifie qu'il est renseigné et pas trop long.",
  phone: "Ce numéro n'a pas été accepté. Dix chiffres, en commençant par 0.",
  address: "Cette adresse n'a pas été acceptée. Elle est peut-être trop longue.",
  postalCode: "Ce code postal n'a pas été accepté. Cinq chiffres attendus.",
  city: "Cette ville n'a pas été acceptée. Vérifie qu'elle n'est pas trop longue.",
  doNewsletter: "Ce choix n'a pas été enregistré.",
};

/** Exemple attendu, quand un champ au motif imposé est mal saisi. */
const MESSAGES_MOTIF: Partial<Record<ChampProfil, string>> = {
  phone: 'Dix chiffres, en commençant par 0. Par exemple 0612345678.',
  postalCode: 'Cinq chiffres. Par exemple 69003.',
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

/**
 * Motif imposé par le contrat, sur un champ facultatif : un champ laissé vide
 * est accepté, puisqu'il partira à `null`.
 */
function motifFacultatif(motif: RegExp): ValidatorFn {
  return (control: AbstractControl<string>): ValidationErrors | null => {
    const valeur = control.value.trim();
    return valeur === '' || motif.test(valeur) ? null : { motif: true };
  };
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
    UiSwitch,
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
    phone: new FormControl('', {
      nonNullable: true,
      validators: [motifFacultatif(PROFILE_RULES.phone.pattern)],
    }),
    address: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(PROFILE_RULES.address.maxLength)],
    }),
    postalCode: new FormControl('', {
      nonNullable: true,
      validators: [motifFacultatif(PROFILE_RULES.postalCode.pattern)],
    }),
    city: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(PROFILE_RULES.city.maxLength)],
    }),
    doNewsletter: new FormControl(false, { nonNullable: true }),
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
    const lettres = `${profil.firstName?.charAt(0) ?? ''}${profil.lastName?.charAt(0) ?? ''}`;
    // Un compte Google peut n'avoir ni prénom ni nom : reste l'email.
    return (lettres === '' ? profil.email.charAt(0) : lettres).toUpperCase();
  });

  protected readonly nomComplet = computed(() => {
    const profil = this.profil();
    if (profil === null) {
      return '';
    }
    return [profil.firstName, profil.lastName].filter((partie) => partie !== null).join(' ');
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

    if (saisi.firstName.trim() !== (enregistre.firstName ?? '')) {
      modifies.push('firstName');
    }
    if (saisi.lastName.trim() !== (enregistre.lastName ?? '')) {
      modifies.push('lastName');
    }
    if (normaliser(saisi.phone) !== enregistre.phone) {
      modifies.push('phone');
    }
    if (normaliser(saisi.address) !== enregistre.address) {
      modifies.push('address');
    }
    if (normaliser(saisi.postalCode) !== enregistre.postalCode) {
      modifies.push('postalCode');
    }
    if (normaliser(saisi.city) !== enregistre.city) {
      modifies.push('city');
    }
    if (saisi.doNewsletter !== enregistre.doNewsletter) {
      modifies.push('doNewsletter');
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
      const { requiredLength } = erreurs['maxlength'] as { requiredLength: number };
      return `${requiredLength} caractères au maximum.`;
    }
    if (erreurs['motif'] !== undefined) {
      return MESSAGES_MOTIF[champ] ?? 'Cette valeur est invalide.';
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

    /*
     * PATCH partiel : on n'envoie que ce qui a changé (`minProperties: 1` du
     * contrat). Aucun identifiant n'est joint : l'API prend le compte dans le
     * cookie de session, donc un profil ne peut pas en viser un autre.
     */
    const corps: UpdateProfileDraft = {
      ...(modifies.includes('firstName') ? { firstName: saisi.firstName.trim() } : {}),
      ...(modifies.includes('lastName') ? { lastName: saisi.lastName.trim() } : {}),
      ...(modifies.includes('phone') ? { phone: normaliser(saisi.phone) } : {}),
      ...(modifies.includes('address') ? { address: normaliser(saisi.address) } : {}),
      ...(modifies.includes('postalCode') ? { postalCode: normaliser(saisi.postalCode) } : {}),
      ...(modifies.includes('city') ? { city: normaliser(saisi.city) } : {}),
      ...(modifies.includes('doNewsletter') ? { doNewsletter: saisi.doNewsletter } : {}),
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
        firstName: profil.firstName ?? '',
        lastName: profil.lastName ?? '',
        phone: profil.phone ?? '',
        address: profil.address ?? '',
        postalCode: profil.postalCode ?? '',
        city: profil.city ?? '',
        doNewsletter: profil.doNewsletter,
      },
      { emitEvent: false },
    );
    this.valeurs.set(this.form.getRawValue());
  }
}

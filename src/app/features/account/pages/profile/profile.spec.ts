import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';

import type { ApiErrorBody } from '../../../../core/api/api-error';
import type { UpdateProfileDraft, UserProfile } from '../../../../core/api/api.types';
import { mockUsers } from '../../../../core/api/mocks/fixtures/users.fixture';
import { SessionService } from '../../../../core/api/session.service';
import { UsersService } from '../../../../core/api/users.service';

import { Profile } from './profile';

/** Un compte tout juste créé : seul l'email est connu. C'est l'état de la fixture. */
const profilVide: UserProfile = mockUsers[0];

/**
 * Un profil rempli, composé ici plutôt que pris dans la fixture : celle-ci est
 * vide exprès, pour que l'application simulée montre ce que montrera le vrai
 * back. Les valeurs reprennent l'adresse du seed de `brume_back`.
 */
const profil: UserProfile = {
  ...profilVide,
  firstName: 'Camille',
  lastName: 'Martin',
  phone: '0612345678',
  address: '12 rue des Lilas',
  postalCode: '69003',
  city: 'Lyon',
  doNewsletter: true,
};

/** Faux service : on contrôle ce que renvoie `updateMe` et on inspecte ce qu'il reçoit. */
class UsersServiceDouble extends UsersService {
  readonly appels: UpdateProfileDraft[] = [];
  constructor(private readonly charge: UserProfile = profil) {
    super();
  }
  reponse: (payload: UpdateProfileDraft) => Observable<UserProfile> = (payload) =>
    of({ ...this.charge, ...payload } as UserProfile);

  override getMe(): Observable<UserProfile> {
    return of(this.charge);
  }

  override updateMe(payload: UpdateProfileDraft): Observable<UserProfile> {
    this.appels.push(payload);
    return this.reponse(payload);
  }
}

function erreurDeValidation(champ: string): HttpErrorResponse {
  const corps: ApiErrorBody = {
    requestId: '00000000-0000-4000-8000-000000000001',
    statusCode: 400,
    code: 'VALIDATION_ERROR',
    message: 'Certains champs sont invalides.',
    details: [{ field: champ, constraints: [`${champ} should not be empty`] }],
    path: '/api/users/me',
    timestamp: '2026-10-27T10:00:00.000Z',
  };
  return new HttpErrorResponse({ status: 400, error: corps, url: '/api/users/me' });
}

describe('Profile', () => {
  let fixture: ComponentFixture<Profile>;
  let service: UsersServiceDouble;

  /** Saisit une valeur dans un champ et notifie Angular, comme le ferait l'utilisateur. */
  function saisir(selecteur: string, valeur: string): void {
    const champ = element().querySelector<HTMLInputElement>(selecteur);
    if (champ === null) {
      throw new Error(`champ introuvable : ${selecteur}`);
    }
    champ.value = valeur;
    champ.dispatchEvent(new Event('input'));
  }

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function texte(): string {
    return element().textContent ?? '';
  }

  async function monter(charge: UserProfile = profil): Promise<void> {
    service = new UsersServiceDouble(charge);
    await TestBed.configureTestingModule({
      imports: [Profile],
      providers: [
        provideRouter([]),
        { provide: UsersService, useValue: service },
        { provide: SessionService, useValue: { logout: () => of(undefined) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Profile);
    await fixture.whenStable();
  }

  beforeEach(() => monter());

  it('préremplit le formulaire avec le profil chargé', () => {
    const champs = element().querySelectorAll<HTMLInputElement>('input');
    const valeurs = [...champs].map((champ) => champ.value);

    expect(valeurs).toContain('Camille');
    expect(valeurs).toContain('Martin');
    expect(valeurs).toContain('12 rue des Lilas');
    expect(valeurs).toContain('69003');
    expect(valeurs).toContain('Lyon');
    expect(valeurs).toContain('0612345678');
    expect(interrupteur().checked).toBe(true);
  });

  it("affiche l'email en lecture seule, sans champ de saisie", () => {
    expect(texte()).toContain('camille.martin@example.com');

    const saisies = [...element().querySelectorAll<HTMLInputElement>('input')];
    expect(saisies.some((champ) => champ.value.includes('@'))).toBe(false);
  });

  // L'authentification va changer : rien dans le formulaire ne doit nommer un
  // fournisseur en particulier.
  it("ne rattache le profil à aucun fournisseur d'identité", () => {
    const identite = element().querySelector('app-ui-card');

    expect(identite?.textContent).not.toContain('Google');
    expect(identite?.querySelector('img')).toBeNull();
  });

  it('montre une connexion sans inventer un compte Google relié et propose la déconnexion', () => {
    const carte = element().querySelector('app-linked-accounts');
    expect(carte?.textContent).toContain('Compte Brume');
    expect(carte?.textContent).not.toContain('Relié');
    expect(carte?.querySelector('app-logout-button button')?.textContent).toContain(
      'Se déconnecter',
    );
    expect(texte()).not.toContain('Apple');
  });

  it("ne propose pas d'enregistrer tant que rien n'a changé", () => {
    expect(texte()).not.toContain('non enregistrée');
  });

  it('annonce le nombre de modifications en attente', async () => {
    saisir('#' + premierChampId(), 'Camille-Rose');
    await fixture.whenStable();

    expect(texte()).toContain('1 modification non enregistrée');
  });

  it("n'envoie que les champs modifiés", async () => {
    saisir('#' + premierChampId(), 'Camille-Rose');
    await fixture.whenStable();
    soumettre();
    await fixture.whenStable();

    expect(service.appels).toEqual([{ firstName: 'Camille-Rose' }]);
  });

  it('confirme après un enregistrement réussi', async () => {
    saisir('#' + premierChampId(), 'Camille-Rose');
    await fixture.whenStable();
    soumettre();
    await fixture.whenStable();

    expect(texte()).toContain('Ton profil est à jour.');
    expect(texte()).not.toContain('non enregistrée');
  });

  it("n'envoie rien quand un champ obligatoire est vide, et affiche l'erreur", async () => {
    saisir('#' + premierChampId(), '   ');
    await fixture.whenStable();
    soumettre();
    await fixture.whenStable();

    expect(service.appels).toHaveLength(0);
    expect(texte()).toContain('Ce champ est obligatoire.');
  });

  it('bascule la lettre de Brume et ne renvoie que ce choix', async () => {
    basculer();
    await fixture.whenStable();
    soumettre();
    await fixture.whenStable();

    expect(service.appels).toEqual([{ doNewsletter: false }]);
  });

  it("n'envoie rien quand le code postal n'a pas cinq chiffres", async () => {
    saisir('#' + champId('69003'), '6900');
    await fixture.whenStable();
    soumettre();
    await fixture.whenStable();

    expect(service.appels).toHaveLength(0);
    expect(texte()).toContain('Cinq chiffres. Par exemple 69003.');
  });

  it("n'envoie rien quand le téléphone n'a pas le bon format", async () => {
    saisir('#' + champId('0612345678'), '12345');
    await fixture.whenStable();
    soumettre();
    await fixture.whenStable();

    expect(service.appels).toHaveLength(0);
    expect(texte()).toContain('Dix chiffres, en commençant par 0.');
  });

  it('efface un champ facultatif en envoyant null, pas une chaîne vide', async () => {
    saisir('#' + champId('12 rue des Lilas'), '  ');
    await fixture.whenStable();
    soumettre();
    await fixture.whenStable();

    expect(service.appels).toEqual([{ address: null }]);
  });

  // Critère de validation 2 de l'US : une modification ne peut pas viser un
  // autre compte. Le front n'envoie aucun identifiant ; l'API prend le sien
  // dans le cookie de session.
  it("ne joint jamais d'identifiant ni d'email au corps envoyé", async () => {
    saisir('#' + premierChampId(), 'Camille-Rose');
    await fixture.whenStable();
    soumettre();
    await fixture.whenStable();

    const envoye = service.appels[0] as Record<string, unknown>;
    expect(envoye).not.toHaveProperty('id');
    expect(envoye).not.toHaveProperty('userId');
    expect(envoye).not.toHaveProperty('email');
    expect(envoye).not.toHaveProperty('role');
  });

  it('garde les corrections saisies quand le serveur refuse', async () => {
    service.reponse = () => throwError(() => erreurDeValidation('firstName'));

    saisir('#' + premierChampId(), 'Camille-Rose');
    await fixture.whenStable();
    soumettre();
    await fixture.whenStable();

    const champ = element().querySelector<HTMLInputElement>('#' + premierChampId());
    expect(champ?.value).toBe('Camille-Rose');
    expect(texte()).toContain('Certains champs sont invalides.');
    expect(texte()).toContain("Ce prénom n'a pas été accepté");
  });

  it('remet les valeurs du profil quand on annule', async () => {
    saisir('#' + premierChampId(), 'Camille-Rose');
    await fixture.whenStable();

    const annuler = [...element().querySelectorAll<HTMLButtonElement>('button')].find(
      (bouton) => bouton.textContent?.trim() === 'Annuler',
    );
    annuler?.click();
    await fixture.whenStable();

    const champ = element().querySelector<HTMLInputElement>('#' + premierChampId());
    expect(champ?.value).toBe('Camille');
    expect(texte()).not.toContain('non enregistrée');
  });

  /*
   * Un compte tout juste créé : tout est à remplir. C'est l'état par défaut de
   * l'application simulée, et celui qu'aura le premier client du vrai back.
   */
  describe('profil encore vide', () => {
    beforeEach(async () => {
      TestBed.resetTestingModule();
      await monter(profilVide);
    });

    it("n'affiche pas de séparateur là où le nom manque", () => {
      const sousTitre = element().querySelector('.bandeau__sous-titre')?.textContent ?? '';

      expect(sousTitre.trim()).toBe('chez Brume depuis mars 2025');
    });

    it("ouvre un formulaire vierge, sans rien proposer d'enregistrer", () => {
      const valeurs = saisies().map((champ) => champ.value);

      expect(valeurs).not.toHaveLength(0);
      expect(valeurs.every((valeur) => valeur === '')).toBe(true);
      expect(interrupteur().checked).toBe(false);
      expect(texte()).not.toContain('non enregistrée');
    });

    it("n'envoie que les champs remplis, et laisse les autres de côté", async () => {
      const champs = saisies();
      saisir('#' + champs[0].id, 'Camille');
      saisir('#' + champs[1].id, 'Martin');
      await fixture.whenStable();
      soumettre();
      await fixture.whenStable();

      expect(service.appels).toEqual([{ firstName: 'Camille', lastName: 'Martin' }]);
    });
  });

  function saisies(): HTMLInputElement[] {
    return [...element().querySelectorAll<HTMLInputElement>('.champ__saisie')];
  }

  /** Identifiant du champ prérempli avec cette valeur. */
  function champId(valeur: string): string {
    const champ = [...element().querySelectorAll<HTMLInputElement>('input')].find(
      (candidat) => candidat.value === valeur,
    );
    if (champ === undefined) {
      throw new Error(`aucun champ ne porte la valeur ${valeur}`);
    }
    return champ.id;
  }

  function interrupteur(): HTMLInputElement {
    const case_ = element().querySelector<HTMLInputElement>('input[type="checkbox"]');
    if (case_ === null) {
      throw new Error('aucun interrupteur');
    }
    return case_;
  }

  /** Bascule l'interrupteur comme le ferait un clic. */
  function basculer(): void {
    const case_ = interrupteur();
    case_.checked = !case_.checked;
    case_.dispatchEvent(new Event('change'));
  }

  /** Identifiant généré par `app-ui-field` pour le premier champ (le prénom). */
  function premierChampId(): string {
    const premier = element().querySelector<HTMLInputElement>('input');
    if (premier === null) {
      throw new Error('aucun champ de saisie');
    }
    return premier.id;
  }

  function soumettre(): void {
    const formulaire = element().querySelector('form');
    formulaire?.dispatchEvent(new Event('submit'));
  }
});

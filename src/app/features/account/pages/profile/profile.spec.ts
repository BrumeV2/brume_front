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

/** Le compte du seed : un seul endroit à corriger quand le contrat change. */
const profil: UserProfile = mockUsers[0];

/** Faux service : on contrôle ce que renvoie `updateMe` et on inspecte ce qu'il reçoit. */
class UsersServiceDouble extends UsersService {
  readonly appels: UpdateProfileDraft[] = [];
  reponse: (payload: UpdateProfileDraft) => Observable<UserProfile> = (payload) =>
    of({ ...profil, ...payload } as UserProfile);

  override getMe(): Observable<UserProfile> {
    return of(profil);
  }

  override updateMe(payload: UpdateProfileDraft): Observable<UserProfile> {
    this.appels.push(payload);
    return this.reponse(payload);
  }
}

function erreurDeValidation(champ: string): HttpErrorResponse {
  const corps: ApiErrorBody = {
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

  beforeEach(async () => {
    service = new UsersServiceDouble();
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
  });

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
    expect(texte()).toContain('Géré par ton compte Google.');

    const saisies = [...element().querySelectorAll<HTMLInputElement>('input')];
    expect(saisies.some((champ) => champ.value.includes('@'))).toBe(false);
  });

  it('montre le compte Google relié et propose de se déconnecter, sans Apple', () => {
    const carte = [...element().querySelectorAll('app-linked-accounts')].find((candidate) =>
      candidate.textContent?.includes('Tu te connectes sans mot de passe.'),
    );

    expect(carte?.textContent).toContain('Google');
    expect(carte?.textContent).toContain('Relié');
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

import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';

import type { ApiErrorBody } from '../../../../core/api/api-error';
import type { UpdateProfileDraft, UserProfile } from '../../../../core/api/api.types';
import { SessionService } from '../../../../core/api/session.service';
import { UsersService } from '../../../../core/api/users.service';

import { Profile } from './profile';

const profil: UserProfile = {
  id: 'e0000000-0000-4000-8000-000000000001',
  email: 'camille.martin@example.com',
  firstName: 'Camille',
  lastName: 'Martin',
  phone: '0612345678',
  role: 'CUSTOMER',
  createdAt: '2025-03-12T09:12:00.000Z',
  birthDate: '1996-05-14',
  avatarUrl: null,
};

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
    expect(valeurs).toContain('1996-05-14');
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

  it('refuse une date de naissance dans le futur', async () => {
    const champDate = [...element().querySelectorAll<HTMLInputElement>('input')].find(
      (champ) => champ.type === 'date',
    );
    expect(champDate).toBeDefined();

    champDate!.value = '2099-01-01';
    champDate!.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    soumettre();
    await fixture.whenStable();

    expect(service.appels).toHaveLength(0);
    expect(texte()).toContain('Cette date est dans le futur.');
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

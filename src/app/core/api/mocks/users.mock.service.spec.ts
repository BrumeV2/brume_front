import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';

import { BROWSER_STORAGE, InMemoryStorage } from '../../storage/browser-storage';
import { toApiError } from '../api-error';
import type { UpdateProfileRequest, User } from '../api.types';
import { UsersService } from '../users.service';

import { MOCK_CUSTOMER_ID } from './fixtures/users.fixture';
import { UsersMockService } from './users.mock.service';

const STORAGE_KEY = 'brume.mock.users';

/** Récupère l'erreur d'un appel censé échouer, normalisée comme dans l'application. */
async function expectFailure(call: Promise<unknown>) {
  try {
    await call;
  } catch (error: unknown) {
    return toApiError(error);
  }
  throw new Error("l'appel aurait dû échouer");
}

describe('UsersMockService', () => {
  let service: UsersService;
  let storage: InMemoryStorage;

  beforeEach(() => {
    storage = new InMemoryStorage();
    TestBed.configureTestingModule({
      providers: [
        { provide: BROWSER_STORAGE, useValue: storage },
        { provide: UsersService, useClass: UsersMockService },
      ],
    });
    service = TestBed.inject(UsersService);
  });

  /** Nouvelle instance sur le même stockage : équivalent d'un rechargement de la page. */
  function afterReload(): UsersService {
    return TestBed.runInInjectionContext(() => new UsersMockService());
  }

  it('renvoie le compte client du seed', async () => {
    const user = await firstValueFrom(service.getMe());

    expect(user.id).toBe(MOCK_CUSTOMER_ID);
    expect(user.email).toBe('camille.martin@example.com');
    expect(user.role).toBe('CUSTOMER');
  });

  it('enregistre une modification valide et la retrouve au rechargement', async () => {
    const updated = await firstValueFrom(
      service.updateMe({ firstName: 'Camille-Rose', phone: '0756781234' }),
    );

    expect(updated.firstName).toBe('Camille-Rose');
    expect(updated.phone).toBe('0756781234');

    const reloaded = await firstValueFrom(afterReload().getMe());
    expect(reloaded.firstName).toBe('Camille-Rose');
    expect(reloaded.phone).toBe('0756781234');
  });

  it('vide le téléphone quand le champ est effacé', async () => {
    const updated = await firstValueFrom(service.updateMe({ phone: '' }));

    expect(updated.phone).toBeNull();
  });

  it('vide la date de naissance quand le champ est effacé', async () => {
    const updated = await firstValueFrom(service.updateMe({ birthDate: '' }));

    expect(updated.birthDate).toBeNull();
  });

  it('enregistre une date de naissance valide', async () => {
    const updated = await firstValueFrom(service.updateMe({ birthDate: '1990-01-31' }));

    expect(updated.birthDate).toBe('1990-01-31');
  });

  it('ne modifie pas les champs absents du corps', async () => {
    const before = await firstValueFrom(service.getMe());
    const updated = await firstValueFrom(service.updateMe({ phone: '0611223344' }));

    expect(updated.firstName).toBe(before.firstName);
    expect(updated.lastName).toBe(before.lastName);
    expect(updated.email).toBe(before.email);
  });

  describe('refus des modifications invalides', () => {
    it('refuse un prénom vide sans rien enregistrer', async () => {
      const before = await firstValueFrom(service.getMe());

      const error = await expectFailure(firstValueFrom(service.updateMe({ firstName: '   ' })));

      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.fieldErrors['firstName']).toBeDefined();

      const after = await firstValueFrom(service.getMe());
      expect(after).toEqual(before);
    });

    it('refuse un téléphone au mauvais format', async () => {
      const error = await expectFailure(firstValueFrom(service.updateMe({ phone: '12345' })));

      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.fieldErrors['phone']).toBeDefined();
    });

    it('refuse un nom de plus de 100 caractères', async () => {
      const error = await expectFailure(
        firstValueFrom(service.updateMe({ lastName: 'M'.repeat(101) })),
      );

      expect(error.fieldErrors['lastName']).toBeDefined();
    });

    it('refuse une date de naissance dans le futur', async () => {
      const error = await expectFailure(
        firstValueFrom(service.updateMe({ birthDate: '2099-01-01' })),
      );

      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.fieldErrors['birthDate']).toBeDefined();
    });

    it('refuse une date de naissance mal formée', async () => {
      const error = await expectFailure(
        firstValueFrom(service.updateMe({ birthDate: '14/05/1996' })),
      );

      expect(error.fieldErrors['birthDate']).toBeDefined();
    });

    it('refuse un corps vide (minProperties du contrat)', async () => {
      const error = await expectFailure(firstValueFrom(service.updateMe({})));

      expect(error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('tentative de modifier un autre compte ou un champ interdit', () => {
    it('refuse un identifiant dans le corps et ne change rien', async () => {
      const before = await firstValueFrom(service.getMe());

      const payload = {
        id: 'e0000000-0000-4000-8000-000000000002',
        firstName: 'Pirate',
      } as UpdateProfileRequest;
      const error = await expectFailure(firstValueFrom(service.updateMe(payload)));

      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.fieldErrors['id']).toBeDefined();

      const after = await firstValueFrom(service.getMe());
      expect(after).toEqual(before);
    });

    it("refuse une tentative de changement d'email ou de rôle", async () => {
      const payload = { email: 'pirate@example.com', role: 'ADMIN' } as UpdateProfileRequest;

      const error = await expectFailure(firstValueFrom(service.updateMe(payload)));

      expect(error.fieldErrors['email']).toBeDefined();
      expect(error.fieldErrors['role']).toBeDefined();

      const after = await firstValueFrom(service.getMe());
      expect(after.email).toBe('camille.martin@example.com');
      expect(after.role).toBe('CUSTOMER');
    });
  });

  it('repart des fixtures si le stockage est corrompu', async () => {
    storage.setItem(STORAGE_KEY, '{ pas du JSON valide');

    const user: User = await firstValueFrom(service.getMe());

    expect(user.email).toBe('camille.martin@example.com');
  });
});

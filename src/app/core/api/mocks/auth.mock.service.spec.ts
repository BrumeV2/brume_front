import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';
import { AuthMockService } from './auth.mock.service';
import { UsersMockService } from './users.mock.service';
import { BROWSER_STORAGE, InMemoryStorage } from '../../storage/browser-storage';
import { MockSession } from './mock-session';

describe('Authentification simulée', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [
        AuthMockService,
        UsersMockService,
        { provide: BROWSER_STORAGE, useFactory: () => new InMemoryStorage() },
      ],
    }),
  );
  it('rouvre la session du compte choisi et restitue son rôle', async () => {
    TestBed.inject(MockSession).close();
    await firstValueFrom(
      TestBed.inject(AuthMockService).login({ email: 'admin@brume.dev', password: 'Simulation1!' }),
    );
    expect((await firstValueFrom(TestBed.inject(UsersMockService).getMe())).role).toBe('ADMIN');
  });
});

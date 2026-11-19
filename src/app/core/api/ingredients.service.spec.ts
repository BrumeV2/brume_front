import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { environment } from '../../../environments/environment';
import { IngredientsHttpService, IngredientsService } from './ingredients.service';

const URL = `${environment.apiBaseUrl}/ingredients`;

describe('IngredientsHttpService', () => {
  let service: IngredientsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: IngredientsService, useClass: IngredientsHttpService },
      ],
    });
    service = TestBed.inject(IngredientsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('appelle `GET /ingredients` sans `q` pour tout le référentiel', () => {
    service.all().subscribe();

    const requete = http.expectOne((r) => r.url === URL);
    expect(requete.request.params.keys()).toEqual([]);
    requete.flush([]);
  });

  it('passe la saisie dans `q`, la règle de synonymes restant au back', () => {
    service.search('badiane').subscribe();

    const requete = http.expectOne((r) => r.url === URL);
    expect(requete.request.params.get('q')).toBe('badiane');
    requete.flush([]);
  });
});

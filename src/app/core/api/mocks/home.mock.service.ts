import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import type { Side } from '../../state/side.store';
import { HomeService, type HomeShowcase } from '../home.service';

import { mockShowcases } from './fixtures/home.fixture';
import { mockOk } from './mock-delay';

/** Vitrine simulée : la seule implémentation tant que le contrat n'a pas de route dédiée. */
@Injectable()
export class HomeMockService extends HomeService {
  override getShowcase(side: Side | null): Observable<HomeShowcase> {
    return mockOk(mockShowcases[side ?? 'neutre']);
  }
}

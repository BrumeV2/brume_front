import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';

import { HomeService } from './core/api/home.service';
import { HomeMockService } from './core/api/mocks/home.mock.service';
import { SessionHttpService, SessionService } from './core/api/session.service';
import { SessionMockService } from './core/api/mocks/session.mock.service';
import { UsersHttpService, UsersService } from './core/api/users.service';
import { UsersMockService } from './core/api/mocks/users.mock.service';
import { credentialsInterceptor } from './core/interceptors/credentials-interceptor';
import { environment } from '../environments/environment';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      // Chaque nouvelle page s'ouvre en haut ; le retour arrière retrouve la position.
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
    ),
    provideHttpClient(withFetch(), withInterceptors([credentialsInterceptor])),
    // Le choix entre données simulées et vraie API se fait ici, une seule fois.
    // Aucun composant ne sait laquelle des deux il reçoit.
    {
      provide: UsersService,
      useClass: environment.useMocks ? UsersMockService : UsersHttpService,
    },
    // Pas encore de route au contrat pour la vitrine de l'accueil : simulée dans tous les cas.
    { provide: HomeService, useClass: HomeMockService },
    {
      provide: SessionService,
      useClass: environment.useMocks ? SessionMockService : SessionHttpService,
    },
  ],
};

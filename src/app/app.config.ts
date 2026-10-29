import { provideHttpClient, withFetch } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';

import { ProductsHttpService, ProductsService } from './core/api/products.service';
import { UsersHttpService, UsersService } from './core/api/users.service';
import { ProductsMockService } from './core/api/mocks/products.mock.service';
import { UsersMockService } from './core/api/mocks/users.mock.service';
import { environment } from '../environments/environment';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withFetch()),
    // Le choix entre données simulées et vraie API se fait ici, une seule fois.
    // Aucun composant ne sait laquelle des deux il reçoit.
    {
      provide: UsersService,
      useClass: environment.useMocks ? UsersMockService : UsersHttpService,
    },
    {
      provide: ProductsService,
      useClass: environment.useMocks ? ProductsMockService : ProductsHttpService,
    },
  ],
};

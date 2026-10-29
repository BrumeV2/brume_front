import { HttpInterceptorFn } from '@angular/common/http';

import { environment } from '../../../environments/environment';

const METHODES_SANS_EFFET = ['GET', 'HEAD', 'OPTIONS'];

/**
 * Prépare chaque requête vers l'API pour la session par cookie (docs/AUTH.md du back).
 *
 * - `withCredentials` : le cookie HttpOnly `brume_session` doit partir avec la
 *   requête, y compris en production où l'API est sur un autre sous-domaine.
 * - `X-CSRF-Protection: 1` : exigé par l'API sur toute mutation.
 *
 * Les requêtes vers un autre hôte ne sont pas touchées : le cookie ne doit
 * jamais partir ailleurs que vers l'API.
 */
export const credentialsInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith(environment.apiBaseUrl)) {
    return next(request);
  }

  const mutation = !METHODES_SANS_EFFET.includes(request.method);
  return next(
    request.clone({
      withCredentials: true,
      ...(mutation ? { setHeaders: { 'X-CSRF-Protection': '1' } } : {}),
    }),
  );
};

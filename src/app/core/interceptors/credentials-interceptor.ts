import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { PUBLIC_AUTH_REQUEST } from '../api/auth-api.service';
import { AccessTokenStore } from '../auth/access-token.store';

const METHODES_SANS_EFFET = ['GET', 'HEAD', 'OPTIONS'];

/** Compare aussi l'origine et la frontière du chemin : aucun jeton hors API. */
function versApi(url: string): boolean {
  const origine = globalThis.location?.origin ?? 'http://localhost';
  const base = new URL(environment.apiBaseUrl, origine);
  const cible = new URL(url, origine);
  const chemin = base.pathname.replace(/\/$/, '');
  return (
    cible.origin === base.origin &&
    (cible.pathname === chemin || cible.pathname.startsWith(`${chemin}/`))
  );
}

/** Bearer en mémoire, cookies conservés et CSRF sur les mutations anonymes. */
export const credentialsInterceptor: HttpInterceptorFn = (request, next) => {
  if (!versApi(request.url)) return next(request);

  const tokens = inject(AccessTokenStore);
  const router = inject(Router, { optional: true });
  const publique = request.context.get(PUBLIC_AUTH_REQUEST);
  const token = publique ? null : tokens.get();
  const version = tokens.version;
  const mutation = !METHODES_SANS_EFFET.includes(request.method);
  const headers: Record<string, string> = {
    ...(mutation ? { 'X-CSRF-Protection': '1' } : {}),
    ...(token === null ? {} : { Authorization: `Bearer ${token}` }),
  };
  return next(request.clone({ withCredentials: true, setHeaders: headers })).pipe(
    catchError((error: unknown) => {
      const nonConnecte =
        error instanceof HttpErrorResponse &&
        (error.status === 401 || error.error?.code === 'UNAUTHENTICATED');
      if (!publique && nonConnecte && version === tokens.version) {
        tokens.invalidate();
        const pagePrivee = /^\/(compte|commande|admin)(?:[/?#]|$)/.test(router?.url ?? '');
        if (token !== null || pagePrivee) {
          void router?.navigate(['/connexion'], {
            queryParams: { session: 'expired' },
            replaceUrl: true,
          });
        }
      }
      return throwError(() => error);
    }),
  );
};

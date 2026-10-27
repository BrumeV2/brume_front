import { HttpErrorResponse } from '@angular/common/http';
import { Observable, delay, of, throwError, timer } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import type { ApiErrorBody, ApiErrorCode } from '../api-error';

/**
 * Latence appliquée à toutes les réponses simulées. Sans elle, les écrans
 * s'écrivent sans état de chargement et cassent le jour où le back arrive.
 */
export const MOCK_DELAY_MS = 350;

/** Réponse simulée en succès. */
export function mockOk<T>(value: T): Observable<T> {
  return of(value).pipe(delay(MOCK_DELAY_MS));
}

/**
 * Erreur simulée, au format exact du contrat et dans un `HttpErrorResponse`,
 * pour que `toApiError()` se comporte comme avec la vraie API.
 */
export function mockFail(
  statusCode: number,
  code: ApiErrorCode,
  message: string,
  details?: ApiErrorBody['details'],
  path = '/api',
): Observable<never> {
  const body: ApiErrorBody = {
    statusCode,
    code,
    message,
    path,
    timestamp: new Date().toISOString(),
    ...(details === undefined ? {} : { details }),
  };

  return timer(MOCK_DELAY_MS).pipe(
    switchMap(() =>
      throwError(
        () =>
          new HttpErrorResponse({
            status: statusCode,
            statusText: code,
            error: body,
            url: path,
          }),
      ),
    ),
  );
}

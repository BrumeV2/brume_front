import { HttpErrorResponse } from '@angular/common/http';

import type { components } from './schema';

/** Corps d'erreur renvoyé par l'API. Même forme pour toutes les routes (voir `docs/API.md`). */
export type ApiErrorBody = components['schemas']['Error'];

/** Codes d'erreur du contrat. Stables : c'est sur eux que le front décide. */
export type ApiErrorCode = ApiErrorBody['code'];

/** Une entrée de `details` pour une erreur `VALIDATION_ERROR`. */
interface ValidationDetail {
  readonly field: string;
  readonly constraints: readonly string[];
}

/**
 * Erreur d'API normalisée. Aucun composant ne manipule un `HttpErrorResponse` brut.
 *
 * `message` est affichable mais jamais utilisé comme clé de décision : il peut changer.
 */
export interface ApiError {
  readonly statusCode: number;
  readonly code: ApiErrorCode | 'UNKNOWN';
  readonly message: string;
  /** Erreurs par champ, extraites de `details` sur une `VALIDATION_ERROR`. */
  readonly fieldErrors: Readonly<Record<string, readonly string[]>>;
}

const GENERIC_MESSAGE = 'Une erreur est survenue. Merci de réessayer.';

function isValidationDetail(value: unknown): value is ValidationDetail {
  if (value === null || typeof value !== 'object') {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record['field'] === 'string' && Array.isArray(record['constraints']);
}

function readFieldErrors(body: ApiErrorBody): Record<string, readonly string[]> {
  const details = body.details;
  if (!Array.isArray(details)) {
    return {};
  }
  const fieldErrors: Record<string, readonly string[]> = {};
  for (const detail of details) {
    if (isValidationDetail(detail)) {
      fieldErrors[detail.field] = detail.constraints.filter(
        (constraint): constraint is string => typeof constraint === 'string',
      );
    }
  }
  return fieldErrors;
}

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  if (value === null || typeof value !== 'object') {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record['code'] === 'string' && typeof record['message'] === 'string';
}

/**
 * Transforme n'importe quelle erreur en `ApiError`.
 *
 * Une réponse hors contrat (coupure réseau, proxy en erreur, HTML d'une page 502)
 * devient un `UNKNOWN` avec un message générique, jamais un plantage.
 */
export function toApiError(error: unknown): ApiError {
  if (error instanceof HttpErrorResponse && isApiErrorBody(error.error)) {
    const body = error.error;
    return {
      statusCode: body.statusCode ?? error.status,
      code: body.code,
      message: body.message,
      fieldErrors: readFieldErrors(body),
    };
  }

  if (error instanceof HttpErrorResponse) {
    return {
      statusCode: error.status,
      code: 'UNKNOWN',
      message: error.status === 0 ? 'Serveur injoignable. Vérifie ta connexion.' : GENERIC_MESSAGE,
      fieldErrors: {},
    };
  }

  return { statusCode: 0, code: 'UNKNOWN', message: GENERIC_MESSAGE, fieldErrors: {} };
}

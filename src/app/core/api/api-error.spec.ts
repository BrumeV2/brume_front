import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { describe, expect, it } from 'vitest';
import { toApiError } from './api-error';

describe('Diagnostic des erreurs API', () => {
  it('conserve requestId, le code et les erreurs de champ', () => {
    const error = toApiError(
      new HttpErrorResponse({
        status: 400,
        error: {
          statusCode: 400,
          code: 'VALIDATION_ERROR',
          message: 'Vérifie les champs.',
          requestId: 'trace-auth',
          details: [{ field: 'password', constraints: ['password invalid'] }],
        },
      }),
    );
    expect(error.requestId).toBe('trace-auth');
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.fieldErrors['password']).toEqual(['password invalid']);
  });
  it('récupère X-Request-ID même sur une réponse hors contrat', () => {
    expect(
      toApiError(
        new HttpErrorResponse({
          status: 503,
          headers: new HttpHeaders({ 'X-Request-ID': 'trace-header' }),
        }),
      ).requestId,
    ).toBe('trace-header');
  });
});

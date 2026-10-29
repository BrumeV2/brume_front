import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

// inject() n'est valable qu'avant le premier await : tout est résolu en tête.

/** Pages réservées aux clients connectés : sinon, direction la connexion. */
export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return (await auth.currentUser()) ? true : router.createUrlTree(['/connexion']);
};

/** Connexion et inscription n'ont pas de sens pour un client déjà connecté. */
export const guestGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return (await auth.currentUser()) ? router.createUrlTree(['/compte']) : true;
};

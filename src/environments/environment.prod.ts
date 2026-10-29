export const environment = {
  production: true,
  apiBaseUrl: '/api',
  /**
   * ⚠️ Volontairement à `true` : l'API `/users/me` n'existe pas encore.
   * Sans cela, l'écran de profil déployé en préproduction n'afficherait
   * qu'une erreur, alors que la story demande un comportement démontrable.
   *
   * À repasser à `false` dès que le back expose `GET` et `PATCH /api/users/me`.
   */
  useMocks: true,
};

/**
 * Configuration de production, substituée à `environment.ts` au build
 * (`fileReplacements` dans `angular.json`).
 */
export const environment = {
  production: true,
  /**
   * API servie par Caddy sur la VM (voir brume_infra). URL absolue : l'API vit
   * sur un autre sous-domaine que le front (app.ybrume.duckdns.org), donc un
   * préfixe relatif ne suffit pas.
   */
  apiBaseUrl: 'https://api.ybrume.duckdns.org/api',
  /**
   * ⚠️ Volontairement à `true` : l'API `/users/me` n'existe pas encore.
   * Sans cela, l'écran de profil déployé en préproduction n'afficherait
   * qu'une erreur, alors que la story demande un comportement démontrable.
   *
   * À repasser à `false` dès que le back expose `GET` et `PATCH /api/users/me`.
   */
  useMocks: false,
};

/**
 * Configuration de production, substituée à `environment.ts` au build
 * (`fileReplacements` dans `angular.json`).
 */
export const environment = {
  /** Catalogue US-014 simulé indépendamment des autres ressources. */
  useCatalogMocks: true,
  production: true,
  /**
   * API servie par Caddy sur la VM (voir brume_infra). URL absolue : l'API vit
   * sur un autre sous-domaine que le front (app.ybrume.duckdns.org), donc un
   * préfixe relatif ne suffit pas.
   */
  apiBaseUrl: 'https://api.ybrume.duckdns.org/api',
  /**
   * La préproduction parle à la vraie API : rien de simulé n'y est démontré.
   *
   * `GET` et `PATCH /users/me` sont écrits côté back, mais sur sa branche
   * `develop` : tant qu'ils ne sont pas livrés en préproduction, l'écran de
   * profil y annoncera un échec de chargement. C'est voulu, et c'est plus
   * honnête que de remettre les données simulées : il n'y a plus rien à
   * corriger côté front, seulement à livrer côté back.
   */
  useMocks: false,
};

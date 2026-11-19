/**
 * Configuration de développement, valeur par défaut. Remplacée au build de
 * production par `environment.prod.ts` (`fileReplacements` dans `angular.json`).
 *
 * Aucun secret ici : tout ce qui est compilé est public.
 */
export const environment = {
  /**
   * Catalogue branché sur l'API locale, indépendamment des autres ressources.
   *
   * Demande la pile du back : `docker compose up -d --build` dans
   * `brume_back`, puis `migration:run`, `seed` et `seed:reviews`. Le front
   * parle alors à `localhost:3000` via `proxy.conf.json`, et
   * `ProductsHttpService` traduit les formes du contrat vers le modèle de
   * l'écran — voir `catalogue-api.types.ts`.
   *
   * À repasser à `true` pour travailler sans Docker : seul le catalogue
   * retombe sur les données simulées, le reste ne bouge pas.
   */
  useCatalogMocks: false,
  production: false,
  /**
   * Préfixe de toutes les requêtes vers l'API. `proxy.conf.json` renvoie `/api`
   * vers `localhost:3000`, ce qui vaut aussi pour la navigation pleine page du
   * parcours Google (`/api/auth/google`).
   */
  apiBaseUrl: '/api',
  /** `true` = les services d'API sont remplacés par leurs implémentations simulées. */
  useMocks: false,
};

/**
 * Configuration de développement, valeur par défaut. Remplacée au build de
 * production par `environment.prod.ts` (`fileReplacements` dans `angular.json`).
 *
 * Aucun secret ici : tout ce qui est compilé est public.
 */
export const environment = {
  production: false,
  /**
   * Préfixe de toutes les requêtes vers l'API. `proxy.conf.json` renvoie `/api`
   * vers `localhost:3000`, ce qui vaut aussi pour la navigation pleine page du
   * parcours Google (`/api/auth/google`).
   */
  apiBaseUrl: '/api',
  /** `true` = les services d'API sont remplacés par leurs implémentations simulées. */
  useMocks: true,
};

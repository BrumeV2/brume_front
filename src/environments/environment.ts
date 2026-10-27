/**
 * Configuration de développement. Remplacée au build de production par
 * `environment.prod.ts` (`fileReplacements` dans `angular.json`).
 *
 * Aucun secret ici : tout ce qui est compilé est public.
 */
export const environment = {
  production: false,
  /** Préfixe de toutes les requêtes. `proxy.conf.json` renvoie `/api` vers l'API locale. */
  apiBaseUrl: '/api',
  /** `true` = les services d'API sont remplacés par leurs implémentations simulées. */
  useMocks: true,
};

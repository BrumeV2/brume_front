# brume_front

Frontend Angular 21 avec composants standalone, routage, SCSS et tests Vitest.

## Prérequis

Node.js 20.19 ou supérieur dans la branche 20, 22.12 ou supérieur dans la branche 22, ou 24.x.

## Installation et lancement

```bash
npm ci
npm start
```

Application accessible sur http://localhost:4200/.

## Connexion Google (OAuth)

Le parcours OAuth est entièrement géré par l'API (`brume_back`, `docs/AUTH.md`) : le bouton
Google navigue vers `/api/auth/google`, l'API pose un cookie HttpOnly `brume_session` puis
redirige vers `/compte`. Le front ne manipule aucun jeton.

L'URL de l'API est dans `src/environments/` (`localhost:3000` en développement). Dans le `.env`
de l'API, en local :

```
CORS_ORIGIN=http://localhost:4200
AUTH_SUCCESS_URL=http://localhost:4200/compte
```

Pages : `/connexion`, `/inscription` (réservées aux visiteurs), `/compte` (réservée aux clients).

## Vérifications

```bash
npm run build
npm test -- --watch=false
```

La compilation de production est générée dans `dist/brume-front/`.

## Générer un composant

```bash
npm exec ng generate component nom-du-composant
```

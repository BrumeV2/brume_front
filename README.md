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

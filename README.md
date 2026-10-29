<div align="center">

# 🍃 Brume — Front

**Application web de Brume, boutique en ligne de thé, café et CBD.**

![Angular](https://img.shields.io/badge/Angular-21-DD0031?logo=angular&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-22-5FA04E?logo=nodedotjs&logoColor=white)
![SCSS](https://img.shields.io/badge/SCSS-styles-CC6699?logo=sass&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-tests-6E9F18?logo=vitest&logoColor=white)
![Prettier](https://img.shields.io/badge/Prettier-format-F7B93E?logo=prettier&logoColor=black)

</div>

---

## Sommaire

- [À propos](#-à-propos)
- [Stack technique](#-stack-technique)
- [Démarrage rapide](#-démarrage-rapide)
- [Configuration](#-configuration)
- [Commandes utiles](#-commandes-utiles)
- [Structure du projet](#-structure-du-projet)
- [Conventions de code](#-conventions-de-code)
- [Conventions de nommage](#-conventions-de-nommage)
- [Travailler sans le back](#-travailler-sans-le-back)
- [Tests](#-tests)
- [Workflow Git](#-workflow-git)
- [Contribuer](#-contribuer)
- [Déploiement](#-déploiement)

---

## 📖 À propos

Brume vend du thé, du café et du CBD en ligne, avec en plus quelques produits maison :

| Concept                   | Description                                                                                                       |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **TEA-BOX**               | Box _Découverte_ (achat unique), _Sélection_ (abonnement mensuel), _Custom_ (composée par le client) et _Tournoi_ |
| **TeaOMatic**             | Configurateur de mélange perso : base, ingrédients, proportions et nom                                            |
| **TeaTouan**              | Personnage virtuel de fidélité qui gagne de l'XP, monte de niveau et débloque des récompenses                     |
| **Bataille des Mélanges** | Tournoi mensuel de dégustation où les clients votent                                                              |
| **Calendrier de l'Avent** | Coffret physique saisonnier de 24 produits, un par jour                                                           |

Ce dépôt ne contient **que le front**. L'API est dans [`brume_back`](https://github.com/BrumeV2/brume_back), et l'infrastructure de déploiement dans `brume_infra`.

**Documents de référence**, tous dans `brume_back` (branche `develop`) :

| Document                                                                                                      | Contenu                                                                |
| ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| [`docs/contract/openapi.yaml`](https://github.com/BrumeV2/brume_back/blob/develop/docs/contract/openapi.yaml) | **Source de vérité** du contrat d'API                                  |
| [`docs/API.md`](https://github.com/BrumeV2/brume_back/blob/develop/docs/API.md)                               | Règles du contrat : codes d'erreur, pagination, auth, parcours d'achat |
| [`docs/DATA-MODEL.md`](https://github.com/BrumeV2/brume_back/blob/develop/docs/DATA-MODEL.md)                 | Entités et champs                                                      |
| [`docs/DECISIONS.md`](https://github.com/BrumeV2/brume_back/blob/develop/docs/DECISIONS.md)                   | Décisions produit (TVA, livraison, statuts…)                           |
| [`docs/contract/seed.json`](https://github.com/BrumeV2/brume_back/blob/develop/docs/contract/seed.json)       | Jeu de données de référence, utilisé pour nos fixtures et nos mocks    |

L'architecture détaillée du front est dans [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). Les tokens et les composants communs sont décrits dans [`docs/DESIGN-SYSTEM.md`](docs/DESIGN-SYSTEM.md).

---

## 🧰 Stack technique

- **Framework** : [Angular 21](https://angular.dev/), composants **standalone**, **signals** et nouvelle syntaxe de contrôle de flux (`@if`, `@for`, `@switch`)
- **Langage** : TypeScript 5.9 en mode `strict`, templates en `strictTemplates`
- **Build** : `@angular/build:application` (esbuild / Vite)
- **Styles** : SCSS, un fichier par composant (`styleUrl`), styles globaux dans `src/styles.scss`
- **Routage** : `provideRouter`, routes chargées à la demande (`loadComponent` / `loadChildren`)
- **HTTP** : `provideHttpClient(withFetch())` + intercepteurs fonctionnels
- **Tests** : [Vitest](https://vitest.dev/) via le builder `@angular/build:unit-test`, DOM simulé par `jsdom`
- **Formatage** : [Prettier](https://prettier.io/) 3 (+ `.editorconfig`)

---

## 🚀 Démarrage rapide

**Prérequis :** Git et Node.js dans une version supportée par Angular 21 — **`^20.19`, `^22.12` ou `^24.x`**. Node 25 n'est pas supporté : le CLI affiche un avertissement et certains builds échouent. `nvm use 22` règle le problème.

```bash
# 1. Cloner le dépôt
git clone git@github.com:BrumeV2/brume_front.git
cd brume_front

# 2. Installer les dépendances (npm ci, pas npm install : on respecte le lockfile)
npm ci

# 3. Lancer le serveur de développement
npm start
```

L'application est alors sur **http://localhost:4200/**, avec rechargement à chaud.

> Pour la brancher sur une API, voir [Configuration](#-configuration) et [Travailler sans le back](#-travailler-sans-le-back).

---

## 🔐 Configuration

Angular n'utilise **pas** de fichier `.env` : la configuration est compilée dans le bundle. Elle vit dans `src/environments/` et le build choisit le bon fichier via `fileReplacements` (voir [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)).

| Clé          | Dev    | Prod    | Description                                                                |
| ------------ | ------ | ------- | -------------------------------------------------------------------------- |
| `apiBaseUrl` | `/api` | `/api`  | Préfixe de toutes les requêtes. En dev, le proxy renvoie vers l'API locale |
| `useMocks`   | `true` | `false` | Sert les données simulées au lieu d'appeler l'API (voir plus bas)          |

- **Aucun secret dans le front.** Tout ce qui est compilé est public : pas de clé d'API privée, pas de mot de passe. Les clés publiques (ex. clé publiable Stripe) sont acceptables.
- L'URL de l'API passe par un **proxy de développement** (`proxy.conf.json`) plutôt que par une URL absolue : même origine qu'en production, donc pas de CORS et pas de souci avec le cookie de session `brume_session` (HttpOnly).

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
npm start                      # serveur de dev sur http://localhost:4200
npm run build                  # build de production dans dist/brume-front/
npm run watch                  # build de développement en continu
npm test                       # tests en mode watch
npm test -- --watch=false      # tests en une passe (ce que fait la CI)
npx prettier --write src docs  # formater le code et la documentation
npx prettier --check src docs  # vérifier le formatage sans rien modifier
```

> Les fichiers générés par Angular à l'initialisation du projet (`angular.json`, `package.json`, `src/main.ts`, `src/app/app.*`, les `tsconfig.*.json`) **ne sont pas encore conformes à Prettier**. Une passe de formatage du dépôt est à faire dans une PR `chore/` à part, pour ne pas noyer les vraies modifications dans du reformatage. En attendant, on formate **ce qu'on écrit**, pas tout le dépôt.

### Générer du code

On utilise le CLI, jamais de fichier créé à la main : il respecte `angular.json` (SCSS, préfixe `app`).

```bash
npx ng generate component features/catalog/product-card
npx ng generate service core/api/products --type=service
npx ng generate guard core/guards/auth
npx ng generate pipe shared/pipes/price
npx ng generate interceptor core/interceptors/auth
npx ng generate directive shared/directives/autofocus
```

Ce que ces commandes produisent réellement avec Angular 21 :

| Commande                                            | Fichiers créés                                                    | Symbole                     |
| --------------------------------------------------- | ----------------------------------------------------------------- | --------------------------- |
| `generate component features/catalog/product-card`  | `product-card/` → `product-card.ts`, `.html`, `.scss`, `.spec.ts` | `ProductCard`               |
| `generate service core/api/products --type=service` | `products.service.ts` + `.spec.ts`                                | `ProductsService`           |
| `generate guard core/guards/auth`                   | `auth-guard.ts` + `.spec.ts`                                      | `authGuard` (fonctionnelle) |
| `generate pipe shared/pipes/price`                  | `price-pipe.ts` + `.spec.ts`                                      | `PricePipe`                 |
| `generate interceptor core/interceptors/auth`       | `auth-interceptor.ts` + `.spec.ts`                                | `authInterceptor`           |

> ⚠️ Deux pièges du CLI en version 21 :
>
> - **Les services n'ont plus de suffixe par défaut** : `generate service products` donne `products.ts` et une classe `Products`, impossible à distinguer d'un composant. On ajoute donc **toujours `--type=service`**. Les gardes, pipes et intercepteurs, eux, gardent leur suffixe tout seuls (`-guard`, `-pipe`, `-interceptor`) et n'acceptent pas `--type`.
> - **Utiliser `npx ng …` et pas `npm exec ng …`** : npm intercepte les options comme `--type` et les ignore silencieusement.

---

## 🗂️ Structure du projet

```
src/
├── main.ts                 # bootstrapApplication(App, appConfig)
├── index.html
├── styles.scss             # styles globaux : reset, tokens, typographie
├── environments/           # configuration par environnement
└── app/
    ├── app.ts              # composant racine (shell)
    ├── app.config.ts       # providers de l'application
    ├── app.routes.ts       # routes de premier niveau
    ├── core/               # transverse et sans UI : API, auth, intercepteurs, gardes
    ├── layout/             # header, footer, shell de navigation
    ├── features/           # un dossier par domaine métier, chargé à la demande
    └── shared/             # composants, directives et pipes réutilisables, sans métier
```

Le détail — rôle de chaque dossier, anatomie d'une feature, couche API, règles — est dans **[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)**. Ce document est la référence : l'arborescence qu'il décrit est la cible, elle se remplit au fur et à mesure des US.

---

## 📏 Conventions de code

Ce qui est **déjà appliqué par la configuration du dépôt** :

| Sujet                  | Règle                                                                                                                   | Appliqué par                    |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| Indentation            | 2 espaces, pas de tabulation                                                                                            | `.editorconfig`                 |
| Encodage               | UTF-8, saut de ligne final, pas d'espaces en fin de ligne                                                               | `.editorconfig`                 |
| Guillemets             | **simples** en TypeScript                                                                                               | `.editorconfig` + `.prettierrc` |
| Largeur de ligne       | **100 caractères**                                                                                                      | `.prettierrc`                   |
| Styles                 | **SCSS**, un fichier par composant                                                                                      | `angular.json`                  |
| Préfixe des sélecteurs | `app-`                                                                                                                  | `angular.json`                  |
| TypeScript             | `strict`, `noImplicitOverride`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, `noPropertyAccessFromIndexSignature` | `tsconfig.json`                 |
| Templates              | `strictTemplates`, `strictInjectionParameters`, `strictInputAccessModifiers`                                            | `tsconfig.json`                 |

Ce qu'on **s'engage à respecter** (pas encore outillé) :

- 🚫 **Jamais de `any`.** Un type inconnu se modélise avec `unknown` puis se rétrécit. Les types de l'API viennent du contrat, ils ne se réécrivent pas à la main.
- 🧩 **Un composant = un rôle.** Les composants de `features/` orchestrent et appellent les services ; les composants de `shared/ui/` sont purement présentationnels (entrées / sorties, aucun service métier).
- ⚡ **`ChangeDetectionStrategy.OnPush`** sur tous les composants.
- 📡 **Signals pour l'état**, `computed()` pour tout ce qui se déduit. Pas de `BehaviorSubject` pour du simple état local, et `httpResource()` / `toSignal()` pour les données distantes.
- 💉 **`inject()`** plutôt que l'injection par constructeur.
- 🔒 **Membres `readonly`** et `protected` quand ils ne servent qu'au template, `private` sinon.
- 🧵 **Pas de logique dans le template.** Un calcul va dans un `computed()` ou un pipe, pas dans l'interpolation.
- 🧹 **Désabonnement systématique** : `takeUntilDestroyed()`, ou `toSignal()` qui s'en occupe.
- 💶 **Montants en centimes**, formatés à l'affichage par un pipe dédié. Le front **ne recalcule jamais** un total, une TVA ou des frais de port : ces valeurs viennent de l'API (`POST /checkout/quote`).
- ♿ **Accessibilité** : HTML sémantique, `label` associé à chaque champ, images avec `alt`, navigation au clavier possible. Pas de `div` cliquable.
- 🇫🇷 **Textes de l'interface en français**, code et commentaires en français, identifiants (variables, classes, fichiers) en anglais.
- 📦 **Pas de dépendance ajoutée sans en parler à l'équipe** dans la PR. On préfère ce qu'Angular fournit déjà.
- 🗑️ **Pas de fichier vide « pour plus tard »** : on crée un fichier quand on écrit son code.

> ESLint n'est pas encore configuré sur ce dépôt (contrairement au back). En attendant, Prettier + `strict` font le minimum, et la relecture de PR fait le reste.

---

## 🏷️ Conventions de nommage

**Fichiers et dossiers** en `kebab-case`, toujours. Un dossier par composant quand il a plusieurs fichiers.

| Élément              | Fichier                        | Symbole exporté             | Généré par                        |
| -------------------- | ------------------------------ | --------------------------- | --------------------------------- |
| Composant            | `product-card/product-card.ts` | `ProductCard`               | `generate component`              |
| Service              | `products.service.ts`          | `ProductsService`           | `generate service --type=service` |
| Garde                | `auth-guard.ts`                | `authGuard` (fonctionnelle) | `generate guard`                  |
| Intercepteur         | `auth-interceptor.ts`          | `authInterceptor`           | `generate interceptor`            |
| Pipe                 | `price-pipe.ts`                | `PricePipe`, nom `price`    | `generate pipe`                   |
| Directive            | `autofocus.directive.ts`       | `AutofocusDirective`        | `generate directive`              |
| Résolveur            | `product-resolver.ts`          | `productResolver`           | `generate resolver`               |
| Store de signals     | `cart.store.ts`                | `CartStore`                 | `generate service --type=store`   |
| Modèle / type        | `product.model.ts`             | `Product`, `ProductVariant` | à la main                         |
| Mock                 | `products.mock.ts`             | `mockProducts`              | à la main                         |
| Routes d'une feature | `catalog.routes.ts`            | `catalogRoutes`             | à la main                         |
| Test                 | `<nom-du-fichier>.spec.ts`     | —                           | avec le schematic                 |

**Dans le code :**

| Sujet                  | Règle                                                | Exemple                                 |
| ---------------------- | ---------------------------------------------------- | --------------------------------------- |
| Sélecteur de composant | `app-` + kebab-case                                  | `app-product-card`                      |
| Entrées / sorties      | `camelCase`, sans préfixe `on` sur les entrées       | `input<Product>()`, `output<string>()`  |
| Signal                 | nom du contenu, sans préfixe `$` ni suffixe `Signal` | `products`, `isLoading`                 |
| Booléen                | préfixe `is`, `has` ou `can`                         | `isLoading`, `hasStock`, `canCheckout`  |
| Observable             | suffixe `$`                                          | `products$`                             |
| Constante              | `SCREAMING_SNAKE_CASE`                               | `MAX_CART_ITEMS`                        |
| Montant                | suffixe `Cents` (entier)                             | `priceCents`, `totalCents`              |
| Taux                   | suffixe `Bps` (points de base)                       | `vatRateBps`                            |
| Classe CSS             | `kebab-case`, pas d'abréviation                      | `.product-card__price`                  |
| Chemin de route        | en **français**, en kebab-case                       | `/boutique`, `/panier`, `/commande/:id` |

> Les noms de champs de l'API (`priceCents`, `totalCents`, `vatRateBps`, dates ISO 8601) se reprennent **tels quels**, sans renommage, pour que le code se relise à côté du contrat.

---

## 🎭 Travailler sans le back

Le back n'étant pas encore déployé, on développe sur des **données simulées**. Deux moyens, selon le besoin.

### 1. Mocks dans le dépôt (par défaut)

La couche d'accès aux données est derrière une abstraction : chaque service d'API a une implémentation HTTP et une implémentation simulée, choisies par `environment.useMocks`. Les fixtures sont dérivées de [`seed.json`](https://github.com/BrumeV2/brume_back/blob/develop/docs/contract/seed.json), donc les mêmes identifiants, slugs et prix que ceux du back une fois en place.

Conséquence : **remplacer un mock par un vrai appel ne touche qu'un fichier**, et aucun composant. Le détail du mécanisme est dans [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

### 2. Mock HTTP à partir du contrat

Pour tester de vraies requêtes réseau, les codes d'erreur et la pagination, on fait servir le contrat OpenAPI par Prism :

```bash
# depuis un clone de brume_back (branche develop)
npx @stoplight/prism-cli@5 mock docs/contract/openapi.yaml
```

> ⚠️ Le mock écoute sur `http://localhost:4010` (**sans** `/api`), alors que la vraie API est sur `http://localhost:3000/api`. C'est le `proxy.conf.json` qui absorbe la différence.

Pour forcer une réponse d'erreur précise, Prism accepte un header : `Prefer: code=409, example=priceChanged`.

### Types générés depuis le contrat

Les types des réponses de l'API ne s'écrivent pas à la main, ils se génèrent :

```bash
npx openapi-typescript@7 <chemin>/brume_back/docs/contract/openapi.yaml -o src/app/core/api/schema.d.ts
```

Le fichier généré est **commité** et ne se modifie jamais à la main. On le régénère quand le contrat bouge, dans une PR dédiée.

---

## 🧪 Tests

```bash
npm test                     # watch
npm test -- --watch=false    # une passe
```

- Un `*.spec.ts` **à côté** du fichier testé.
- **Services** : testés avec `provideHttpClientTesting()` et `HttpTestingController`, on vérifie l'URL, la méthode et le corps envoyé.
- **Composants** : `TestBed` + `ComponentFixture`, on teste ce que voit l'utilisateur (texte affiché, état des boutons), pas les détails internes.
- **Logique pure** (formatage de prix, calculs d'affichage) : testée directement, sans `TestBed`.
- On teste **les cas d'erreur de l'API** par leur `code` (`OUT_OF_STOCK`, `PRICE_CHANGED`…), qui est stable, et pas par le `message`.

---

## 🌿 Workflow Git

- `main` : branche de production, protégée. Rien n'y arrive sans PR.
- `dev` : branche d'intégration. **C'est la cible de toutes les PR.**
- Branches de travail : **`feat/scrum-<numéro>/<description-courte>`**

```bash
git switch dev && git pull
git switch -c feat/scrum-42/liste-produits
```

| Préfixe  | Usage                                 |
| -------- | ------------------------------------- |
| `feat/`  | nouvelle fonctionnalité               |
| `fix/`   | correction de bug                     |
| `docs/`  | documentation seule                   |
| `chore/` | outillage, dépendances, configuration |

**Messages de commit** : `type (Scope) : Description à l'infinitif ou au substantif`

```
feat (Fondations) : Dockerisation du front pour le déploiement
feat (Catalogue) : Liste des produits avec filtres
fix (Panier) : Correction du total affiché après suppression d'une ligne
docs (Front) : Normes de code et architecture
```

- Le **numéro du ticket** apparaît dans le nom de la branche et dans la PR.
- Les commits sont signés du compte de leur auteur (`git config user.email` doit correspondre à l'adresse du compte GitHub) : la traçabilité fait partie de l'évaluation.
- Pas de `git push --force` sur une branche partagée.

---

## 🤝 Contribuer

1. **Prendre le ticket** sur le board et se l'assigner.
2. **Créer la branche** depuis `dev` à jour, en respectant la convention ci-dessus.
3. **Développer** en suivant [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). Si un choix d'architecture change, **mettre ce document à jour dans la même PR**.
4. **Vérifier avant de pousser** :
   ```bash
   npx prettier --check src docs
   npm run build
   npm test -- --watch=false
   ```
5. **Ouvrir la PR vers `dev`** avec : le numéro du ticket, ce que ça fait, comment le tester, et une capture ou un GIF dès que c'est visuel.
6. **Faire relire.** Une PR = **au moins une relecture** par quelqu'un d'autre. On ne fusionne pas sa propre PR.
7. **Garder les PR petites.** Au-delà de ~400 lignes modifiées, découper.

**Checklist de relecture :** ça compile · les tests passent · le formatage est bon · pas de `any` · pas de `console.log` oublié · pas de secret · pas de valeur en dur qui devrait venir de l'API · accessible au clavier · les textes sont en français.

---

## 🚢 Déploiement

Le front est construit en statique (`dist/brume-front/browser/`) et servi par un conteneur derrière Caddy, sur la VM décrite dans le dépôt `brume_infra`.

| Environnement | URL                                     | Accès              |
| ------------- | --------------------------------------- | ------------------ |
| Front         | https://app.ybrume.duckdns.org          | VPN NetBird requis |
| API           | https://api.ybrume.duckdns.org/api      | VPN NetBird requis |
| Swagger       | https://api.ybrume.duckdns.org/api/docs | VPN NetBird requis |

---

<div align="center">
<sub>Fait avec 🍵 par l'équipe Brume</sub>
</div>

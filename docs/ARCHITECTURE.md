# Architecture — brume-front

> Ce document est la **référence** : l'arborescence ci-dessous est la **cible**, pas l'existant.
> Un dossier n'est créé **qu'au moment où on attaque l'US qui en a besoin** — pas de fichier vide « pour plus tard ».
> Si un choix change, on met à jour ce document **dans la même PR**.
>
> Côté back, les documents équivalents sont [`docs/ARCHITECTURE.md`](https://github.com/BrumeV2/brume_back/blob/develop/docs/ARCHITECTURE.md) et [`docs/API.md`](https://github.com/BrumeV2/brume_back/blob/develop/docs/API.md) de `brume_back`.

## Sommaire

- [Principe : une feature par domaine métier](#principe--une-feature-par-domaine-métier)
- [Arborescence cible](#arborescence-cible)
- [Les quatre zones](#les-quatre-zones)
- [Anatomie d'une feature](#anatomie-dune-feature)
- [Routage](#routage)
- [État de l'application](#état-de-lapplication)
- [Couche d'accès aux données](#couche-daccès-aux-données)
- [Données simulées](#données-simulées)
- [Erreurs](#erreurs)
- [Styles](#styles)
- [Configuration par environnement](#configuration-par-environnement)
- [Règles](#règles)
- [Correspondance Epics / US → features](#correspondance-epics--us--features)
- [Ordre de construction conseillé](#ordre-de-construction-conseillé-mvp)

---

## Principe : une feature par domaine métier

Le front est découpé en **features** qui correspondent aux domaines du back (catalogue, panier, checkout, commandes, compte). Chaque feature est autonome : ses pages, ses composants, ses routes, ses types.

Deux règles de dépendance, et elles suffisent à garder le projet propre :

1. **Une feature n'importe jamais une autre feature.** Ce qu'elles partagent remonte dans `shared/` (si c'est de l'UI) ou dans `core/` (si c'est de la donnée ou de l'état).
2. **Les dépendances vont toujours dans le même sens :** `features/` → `core/` et `shared/`. Jamais l'inverse. `shared/` ne connaît aucun domaine métier.

```
features/catalog ─┐
features/cart ────┼──▶ core/ (API, état, auth)
features/checkout ┤
features/account ─┘    shared/ (UI sans métier)
```

## Arborescence cible

```
src/
├── main.ts                          # bootstrapApplication(App, appConfig)
├── index.html
├── styles.scss                      # reset, tokens, typographie, utilitaires
├── styles/                          # partiels SCSS globaux
│   ├── _tokens.scss                 # couleurs, espacements, rayons, ombres (issus du Figma)
│   ├── _typography.scss
│   └── _mixins.scss                 # points de rupture, troncature…
├── environments/
│   ├── environment.ts               # dev   (useMocks: true)
│   └── environment.prod.ts          # prod  (useMocks: false)
└── app/
    ├── app.ts / app.html / app.scss # shell : layout + <router-outlet />
    ├── app.config.ts                # providers (router, httpClient, intercepteurs)
    ├── app.routes.ts                # routes de premier niveau
    │
    ├── core/                        # transverse, singleton, AUCUN composant visuel
    │   ├── api/
    │   │   ├── schema.d.ts          # types GÉNÉRÉS depuis openapi.yaml — jamais édités
    │   │   ├── api.types.ts         # alias lisibles extraits de schema.d.ts
    │   │   ├── products.service.ts  # un service par ressource de l'API
    │   │   ├── cart.service.ts
    │   │   ├── orders.service.ts
    │   │   └── mocks/               # implémentations simulées + fixtures (voir plus bas)
    │   ├── auth/
    │   │   ├── auth.service.ts      # session Google : utilisateur courant, déconnexion
    │   │   └── auth.store.ts        # utilisateur courant, rôle, état connecté
    │   ├── state/
    │   │   └── cart.store.ts        # panier, partagé entre header, catalogue et checkout
    │   ├── guards/
    │   │   ├── auth-guard.ts        # route réservée aux connectés
    │   │   └── admin-guard.ts       # route réservée au rôle ADMIN
    │   ├── interceptors/
    │   │   ├── credentials-interceptor.ts # cookie de session + en-tête CSRF vers l'API
    │   │   └── error-interceptor.ts # normalise les erreurs de l'API
    │   └── models/                  # types métier qui ne viennent pas du contrat
    │
    ├── layout/                      # chrome de l'application
    │   ├── header/                  # logo, navigation, recherche, panier, compte
    │   ├── footer/
    │   └── nav-mobile/
    │
    ├── features/                    # un dossier par domaine (voir tableau en bas)
    │   ├── catalog/
    │   ├── cart/
    │   ├── checkout/
    │   ├── orders/
    │   ├── account/
    │   └── auth/
    │
    └── shared/                      # réutilisable, sans aucune logique métier
        ├── ui/                      # button, badge, modal, skeleton, pagination…
        ├── pipes/
        │   └── price-pipe.ts        # centimes → « 12,90 € »
        └── directives/
```

## Les quatre zones

| Zone        | Contient                                                 | Ne contient jamais                      |
| ----------- | -------------------------------------------------------- | --------------------------------------- |
| `core/`     | accès à l'API, état partagé, auth, gardes, intercepteurs | un composant visuel                     |
| `layout/`   | header, footer, navigation — le cadre autour des pages   | de la logique métier                    |
| `features/` | les pages et les composants d'**un** domaine             | un import d'une autre feature           |
| `shared/`   | UI générique, pipes, directives                          | un type métier, un appel HTTP, un store |

Le test pour savoir où va un composant : _« est-ce qu'il aurait du sens dans une autre application ? »_ Oui → `shared/ui/`. Non → la feature concernée.

## Anatomie d'une feature

```
features/catalog/
├── catalog.routes.ts               # routes de la feature, exportées pour app.routes.ts
├── pages/                          # un composant par route
│   ├── product-list/
│   │   ├── product-list.ts
│   │   ├── product-list.html
│   │   └── product-list.scss
│   └── product-detail/
├── components/                     # composants réutilisés DANS cette feature seulement
│   ├── product-card/
│   ├── product-filters/
│   └── variant-picker/
└── catalog.types.ts                # types propres à l'affichage du catalogue
```

- **`pages/`** : un composant par route. Il récupère les paramètres de l'URL, appelle les services de `core/api/`, gère les états `chargement / vide / erreur / contenu`, et distribue aux composants enfants.
- **`components/`** : présentationnels. Ils reçoivent des `input()` et émettent des `output()`. **Ils n'injectent aucun service d'API.**
- Dès qu'un composant de `components/` sert à une deuxième feature, il remonte dans `shared/ui/` et perd ses types métier.

## Routage

Les routes sont **chargées à la demande**, feature par feature. Rien d'autre que le shell n'est dans le bundle initial.

```ts
// app.routes.ts
export const routes: Routes = [
  { path: '', loadComponent: () => import('./features/home/pages/home/home').then((m) => m.Home) },
  {
    path: 'boutique',
    loadChildren: () => import('./features/catalog/catalog.routes').then((m) => m.catalogRoutes),
  },
  {
    path: 'panier',
    loadChildren: () => import('./features/cart/cart.routes').then((m) => m.cartRoutes),
  },
  {
    path: 'commande',
    loadChildren: () => import('./features/checkout/checkout.routes').then((m) => m.checkoutRoutes),
    canActivate: [authGuard],
  },
  {
    path: 'compte',
    loadChildren: () => import('./features/account/account.routes').then((m) => m.accountRoutes),
    canActivate: [authGuard],
  },
  {
    path: '**',
    loadComponent: () => import('./features/not-found/not-found').then((m) => m.NotFound),
  },
];
```

- **Les chemins d'URL sont en français** (`/boutique`, `/panier`, `/commande/:id`), les noms de fichiers et de symboles en anglais.
- Chaque route porte un `title`, repris par Angular dans l'onglet du navigateur.
- Le cadre commun (`App` : `layout/site-header`, contenu, `layout/site-footer`) lit les `data` de la route : `menu: 'transparent'` quand la page commence par une photo ou un bandeau sombre (le menu fixe se pose dessus et devient plein au défilement), `piedDePage: false` pour les écrans pleins (connexion, inscription). Sans `menu: 'transparent'`, le contenu est décalé de `--hauteur-menu`.
- Les entrées du menu et du pied de page sont déclarées dans `layout/navigation.ts`. Une entrée sans `lien` est une fonction pas encore livrée : jamais rendue en lien.
- Les paramètres d'URL se lisent par **signal d'entrée** (`withComponentInputBinding()`), pas par un abonnement à `ActivatedRoute`.
- Les filtres du catalogue (`category`, `type`, `minPriceCents`, `maxPriceCents`, `inStock`, `q`, `sort`, `moment`, `caffeine`) vivent dans les **paramètres de requête**, pour qu'une sélection soit partageable et que le retour arrière défasse le dernier filtre. L'URL est la seule source de vérité : les composants de filtre ne gardent aucun état. Une valeur inconnue n'est pas corrigée en silence, elle part à l'API qui la refuse, et l'écran affiche l'erreur.

## État de l'application

Trois niveaux, du plus local au plus global. On prend toujours le plus local qui suffit.

| Portée                  | Outil                                             | Exemple                           |
| ----------------------- | ------------------------------------------------- | --------------------------------- |
| Un composant            | `signal()` dans le composant                      | ouverture d'un menu, onglet actif |
| Une page et ses enfants | signaux du composant de page, passés en `input()` | liste de produits chargée         |
| Toute l'application     | un **store** dans `core/state/`                   | panier, utilisateur connecté      |

Un store, c'est un service `providedIn: 'root'` qui expose :

- des signaux **en lecture seule** (`asReadonly()`) ;
- des `computed()` pour tout ce qui se déduit (`itemCount`, `subtotalCents`) ;
- des méthodes pour les modifications (`addItem()`, `removeItem()`).

- **`core/state/side.store.ts`** : préférence « plutôt thé / plutôt café » (interrupteur du menu, écran d'intro de l'accueil), gardée pour la session dans `sessionStorage` (jeton `SESSION_STORAGE`).
- **`core/api/home.service.ts`** : vitrine de l'accueil (préférés, moments) selon le côté choisi. **Hors contrat** : seule l'implémentation simulée existe, à rebrancher sur le catalogue quand le back aura une route dédiée.

Personne n'écrit dans un signal de store depuis l'extérieur. Pas de librairie d'état : les signaux d'Angular suffisent à l'échelle du projet.

> **Panier du visiteur** (décision D-017 du back) : tant que le client n'est pas connecté, le panier vit dans le `localStorage`, géré par `cart.store.ts`. À la connexion, le front appelle `POST /cart/merge` pour le fusionner avec le panier du compte, puis vide le stockage local.

## Couche d'accès aux données

Aucun composant n'appelle `HttpClient` directement. Tout passe par un service de `core/api/`, un par ressource de l'API.

```
Composant ──▶ ProductsService ──▶ HttpClient ──▶ intercepteurs ──▶ /api/products
                   │
                   └──▶ ProductsMock (si environment.useMocks)
```

Règles :

- **Les types viennent du contrat.** `schema.d.ts` est généré depuis `openapi.yaml` et commité, jamais modifié à la main :
  ```bash
  npx openapi-typescript@7 ../brume_back/docs/contract/openapi.yaml -o src/app/core/api/schema.d.ts
  ```
  `api.types.ts` en extrait des alias lisibles :
  ```ts
  import type { components } from './schema';
  export type Product = components['schemas']['Product'];
  export type ProductVariant = components['schemas']['ProductVariant'];
  ```
- **Les montants sont des entiers en centimes** (`priceCents`, `totalCents`) et les taux des points de base (`vatRateBps`). Le front les **formate** pour l'affichage, il ne les recalcule jamais. Un total, une TVA ou des frais de port viennent de `POST /checkout/quote` — c'est la règle du back, et une addition faite côté front finirait par diverger.
- **Aucun renommage de champ.** On garde les noms du contrat pour pouvoir relire le code à côté de l'`openapi.yaml`.
- **L'authentification est portée par un intercepteur**, pas par les services. La session est un cookie HttpOnly `brume_session` posé par l'API après Google (voir `docs/AUTH.md` du back) : le front ne voit aucun jeton. `credentials-interceptor.ts` ajoute `withCredentials` à toute requête vers `apiBaseUrl`, et l'en-tête `X-CSRF-Protection: 1` sur les mutations. Une `401` signifie « non connecté » : il n'y a pas de rafraîchissement de session.
- **Déconnexion** (ADD-087) : `AuthService.logout()` appelle `SessionService` (`POST /auth/logout`), puis vide `AuthStore`. Sans confirmation de l'API, rien n'est effacé et l'interface affiche l'échec.
- **Pagination** : les listes renvoient `{ data, meta: { page, limit, total, totalPages } }`. Un composant de liste lit `meta`, il ne compte jamais lui-même.

## Données simulées

Le back n'est pas prêt : on développe sur des mocks. L'objectif est que **le passage aux vrais appels ne touche aucun composant**.

### Le mécanisme

Chaque ressource a une **classe abstraite** qui tient lieu de contrat, une implémentation HTTP et une implémentation simulée. Le choix se fait une seule fois, dans `app.config.ts`.

```
core/api/
├── products.service.ts            # classe abstraite (le contrat) + ProductsHttpService
└── mocks/
    ├── products.mock.service.ts   # ProductsMockService, mêmes signatures, données en mémoire
    ├── fixtures/
    │   ├── products.fixture.ts    # dérivé de seed.json du back
    │   └── categories.fixture.ts
    └── mock-delay.ts              # latence simulée, pour voir les écrans de chargement
```

```ts
// products.service.ts
@Injectable()
export abstract class ProductsService {
  abstract list(query: ProductQuery): Observable<Page<Product>>;
}

@Injectable()
export class ProductsHttpService extends ProductsService {
  /* appels HTTP réels */
}
```

```ts
// app.config.ts
providers: [
  provideHttpClient(withFetch(), withInterceptors([authInterceptor, errorInterceptor])),
  // Le jeton d'injection est la classe abstraite : aucun composant ne sait
  // laquelle des deux implémentations il reçoit.
  {
    provide: ProductsService,
    useClass: environment.useMocks ? ProductsMockService : ProductsHttpService,
  },
],
```

La classe abstraite n'est pas qu'une convention : le compilateur refuse une implémentation simulée qui s'écarterait des signatures réelles.

### Les règles qui rendent le remplacement indolore

1. **Les fixtures sont dérivées de [`seed.json`](https://github.com/BrumeV2/brume_back/blob/develop/docs/contract/seed.json)** du back : mêmes UUID, mêmes slugs, mêmes prix en centimes, mêmes SKU. Pas de « Produit test 1 ».
2. **Les mocks respectent le contrat à la lettre** : mêmes types (`schema.d.ts`), même enveloppe de pagination, mêmes formats de date ISO 8601.
3. **Les mocks sont asynchrones et lents.** Ils renvoient un `Observable` avec un `delay()` de ~300 ms, sinon on écrit des écrans qui ne savent pas afficher un chargement.
4. **Les mocks savent échouer.** Chaque mock peut renvoyer les erreurs du contrat avec leur vrai `code` (`OUT_OF_STOCK`, `PRICE_CHANGED`, `UNAUTHENTICATED`), pour que les cas d'erreur soient développés tout de suite et pas « plus tard ».
5. **Rien de simulé en dehors de `core/api/mocks/`.** Aucun `if (useMocks)` dans un composant, aucun tableau de données en dur dans une page.
6. **Les fixtures ne sont pas les fixtures de test.** Les tests ont leurs propres jeux de données minimaux dans leurs `*.spec.ts`.

### Le jour où le back arrive

1. Régénérer `schema.d.ts` depuis le contrat à jour.
2. Passer `useMocks` à `false` dans `environment.ts`.
3. Faire tomber les erreurs qui apparaissent, ressource par ressource.
4. Supprimer `core/api/mocks/` quand toutes les ressources sont branchées.

Entre les deux, `npx @stoplight/prism-cli@5 mock docs/contract/openapi.yaml` (depuis un clone du back) sert le contrat en HTTP réel sur le port `4010` : utile pour valider les intercepteurs et les erreurs avant que le back existe.

## Erreurs

L'API renvoie **toujours** la même forme d'erreur (voir [`API.md`](https://github.com/BrumeV2/brume_back/blob/develop/docs/API.md)) :

```json
{
  "statusCode": 409,
  "code": "OUT_OF_STOCK",
  "message": "…",
  "details": [],
  "path": "…",
  "timestamp": "…"
}
```

- Le front **décide à partir de `code`**, qui est stable. `message` est affichable, mais jamais testé ni comparé dans le code.
- `error-interceptor.ts` transforme la réponse en un type `ApiError` unique. Un composant ne manipule jamais un `HttpErrorResponse` brut.
- Chaque écran traite explicitement quatre états : **chargement**, **vide**, **erreur**, **contenu**. Les trois premiers ne s'ajoutent pas après coup.
- Les codes à gérer au cas par cas, avec un message utile et une action : `OUT_OF_STOCK`, `PRICE_CHANGED`, `AGE_DECLARATION_REQUIRED`, `SHIPPING_ZONE_NOT_SERVED`, `CART_EMPTY`. Tout le reste tombe dans un message générique.
- `UNAUTHENTICATED` (401) renvoie vers `/connexion` : les gardes de route s'en chargent.

## Styles

- **Tokens d'abord.** Couleurs, espacements, rayons, ombres et typographies sortent du Figma et vivent dans `styles/_tokens.scss`, sous forme de variables CSS. Aucune couleur écrite en dur dans un composant.
- **Un SCSS par composant**, chargé par `styleUrl`. Angular l'encapsule, donc pas besoin de préfixer chaque classe.
- **`styles.scss`** ne contient que le reset, les tokens, la typographie de base et quelques utilitaires. Pas de style de composant.
- **Mobile d'abord** : les media queries montent (`min-width`), avec les points de rupture de `_mixins.scss`.
- Pas de framework CSS tiers. Les composants de `shared/ui/` tiennent ce rôle.
- Budget de style par composant : **4 ko** (avertissement) / **8 ko** (erreur), fixé dans `angular.json`.

## Configuration par environnement

```ts
// environments/environment.ts
export const environment = {
  production: false,
  apiBaseUrl: '/api',
  useMocks: true,
};
```

Le build de production remplace le fichier via `fileReplacements` dans `angular.json`. En développement, `proxy.conf.json` renvoie `/api` vers l'API locale, pour avoir la même origine qu'en production : pas de CORS, et le cookie de session `brume_session` (HttpOnly) fonctionne. En production, l'API est sur un autre sous-domaine : c'est l'intercepteur qui fait partir le cookie.

```json
// proxy.conf.json
{ "/api": { "target": "http://localhost:3000", "secure": false } }
```

Aucun secret dans ces fichiers : tout ce qui est compilé est public.

## Règles

1. **Les composants sont standalone**, avec `ChangeDetectionStrategy.OnPush`.
2. **`inject()`** au lieu de l'injection par constructeur.
3. **Signals pour l'état**, `computed()` pour tout ce qui se déduit, `input()` / `output()` pour les échanges entre composants.
4. **Pas d'appel HTTP hors de `core/api/`.**
5. **Pas de logique métier dans un composant de `shared/`** ni dans un composant de `components/`.
6. **Pas d'import entre features.** Ce qui est commun remonte.
7. **Pas de `any`.** Les types de l'API viennent du contrat.
8. **Les montants restent des centimes** jusqu'à l'affichage, et le front ne recalcule aucun total.
9. **Chargement à la demande** pour chaque feature.
10. **Quatre états par écran** : chargement, vide, erreur, contenu.
11. **Pas de fichier vide « pour plus tard ».**
12. **Ce document est mis à jour dans la PR qui change l'architecture.**

## Correspondance Epics / US → features

Les Epics et les US sont les mêmes que côté back (voir son [`ARCHITECTURE.md`](https://github.com/BrumeV2/brume_back/blob/develop/docs/ARCHITECTURE.md)).

| Epic                           | Feature(s)                                                  | Routes                                       | US                               |
| ------------------------------ | ----------------------------------------------------------- | -------------------------------------------- | -------------------------------- |
| 01 Catalogue & Produits        | `catalog`, `blends` (TeaOMatic)                             | `/boutique`, `/boutique/:slug`, `/teaomatic` | 001-005 · 006-007 · 008-013      |
| 02 Recherche & Découverte      | `catalog` (recherche, filtres, tri), `home`                 | `/boutique?q=…`, `/`                         | 014-017 · 018-020                |
| 03 Panier & Commande           | `cart`, `checkout`, `orders`                                | `/panier`, `/commande`, `/commande/:id`      | 021-024 · 025-028 · 029-032      |
| 04 Paiement                    | `checkout` (redirection Stripe + page de retour)            | `/commande/:id`                              | 033-035 · 038                    |
| 05 Abonnements                 | `subscriptions`                                             | `/compte/abonnements`                        | 039-044                          |
| 06 Compte Client               | `auth`, `account`                                           | `/connexion`, `/inscription`, `/compte`      | 045-046 · 047-048, 051 · 049-050 |
| 07 Livraison                   | `checkout` (choix du mode), `orders` (suivi)                | `/commande`, `/compte/commandes`             | 052-054                          |
| 08 Fidélisation & Gamification | `loyalty` (TeaTouan), `tournament`                          | `/compte/fidelite`, `/bataille`              | 055-057 · 058-061                |
| 09 Marketing                   | `newsletter`, `promotions` (champ code promo), `gift-cards` | —                                            | 062-066                          |
| 10 Avis & Communauté           | `reviews` (dans `catalog`)                                  | `/boutique/:slug`                            | 067-069                          |
| 11 Support Client              | `faq`, `support`                                            | `/faq`, `/contact`                           | 070 · 071-073                    |
| 12 Contenu & Événements        | `blog`, `catalog` (Calendrier de l'Avent)                   | `/blog`, `/blog/:slug`                       | 074-078                          |
| 13 Administration              | `admin`                                                     | `/admin/**` (`adminGuard`)                   | 079-086                          |

## Ordre de construction conseillé (MVP)

1. **Fondations** : `styles/_tokens.scss` d'après le Figma, `shared/ui/` de base (bouton, champ, badge, squelette), `layout/` (header + footer), `core/api/` (schema, intercepteurs, premier service + son mock).
2. **`catalog`** — liste, filtres, fiche produit, sélection de variante : US-001 à 005, 014, 016, 017.
3. **`auth`** + `core/auth/` — inscription, connexion, garde : US-045, 046.
4. **`cart`** + `core/state/cart.store.ts`, panier visiteur et fusion : US-021 à 024.
5. **`checkout`** — adresse, mode de livraison, récapitulatif via `/checkout/quote` : US-025 à 028, 052.
6. **`orders`** — confirmation, détail, historique : US-029 à 032, 050.
7. **`account`** — profil, adresses : US-047, 048, 051.
8. **`admin`** — produits, commandes, stock : US-080 à 086.

Chaque étape se livre **en PR vers `dev`**, avec ses mocks et ses tests.

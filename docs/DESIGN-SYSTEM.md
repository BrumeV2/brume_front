# Design system — brume-front

> Les **tokens** et les **composants** communs du front, d'après la maquette Figma
> « Brume — maquette site » (pages **Fondations** et **Composants**), animés comme la maquette HTML.
>
> Règle d'or : **aucune valeur en dur dans un composant**. Une couleur, une taille de texte, un
> espacement ou un rayon vient d'un token. S'il manque, on l'ajoute dans `styles/_tokens.scss`
> (et dans ce document), on ne le recopie pas.

## Sommaire

- [Où vivent les styles](#où-vivent-les-styles)
- [Tokens](#tokens)
  - [Couleurs](#couleurs)
  - [Typographie](#typographie)
  - [Espacements, formes, mise en page](#espacements-formes-mise-en-page)
- [Points de rupture et mixins](#points-de-rupture-et-mixins)
- [Classes globales](#classes-globales)
- [Animations](#animations)
- [Composants `shared/ui`](#composants-sharedui)
- [Cadre commun `layout/`](#cadre-commun-layout)
- [Directives, pipes et utilitaires](#directives-pipes-et-utilitaires)
- [Ajouter un token ou un composant](#ajouter-un-token-ou-un-composant)

---

## Où vivent les styles

| Fichier                      | Contient                                                                     |
| ---------------------------- | ---------------------------------------------------------------------------- |
| `src/styles/_tokens.scss`    | **Tous** les tokens, en variables CSS sur `:root`. Seule source des valeurs. |
| `src/styles/_mixins.scss`    | Points de rupture et quelques mixins (`surtitre`, `hors-ecran`).             |
| `src/styles.scss`            | Remise à zéro, styles de texte, utilitaires et animations globales.          |
| `*.scss` de chaque composant | Le style du composant, encapsulé par Angular, qui consomme les tokens.       |

Budget par fichier de style de composant : **4 ko** (avertissement) / **8 ko** (erreur). Au-delà, on
découpe le composant (exemple : `home-intro` et `home-intro-panel`).

## Tokens

### Couleurs

Noms de la page « Fondations », préfixés `--couleur-`.

| Token                         | Valeur                    | Usage                                                  |
| ----------------------------- | ------------------------- | ------------------------------------------------------ |
| `--couleur-fond`              | `#f4f1eb`                 | Fond des pages                                         |
| `--couleur-papier`            | `#faf8f4`                 | Cartes, bandes claires, badge de carte produit         |
| `--couleur-encre`             | `#151515`                 | Texte principal, fonds sombres, bouton plein           |
| `--couleur-blanc`             | `#ffffff`                 | Texte sur photo, bouton clair                          |
| `--couleur-filet`             | `#e0dbd2`                 | Bordures et séparateurs                                |
| `--couleur-texte-doux`        | `#77716a`                 | Texte secondaire sur fond clair                        |
| `--couleur-texte-doux-sombre` | `#a9a39a`                 | Texte secondaire sur fond encre                        |
| `--couleur-accent`            | `#6e7a55`                 | Seconde ligne des titres, statut « Relié », succès     |
| `--couleur-accent-clair`      | `#b9bfa6`                 | Seconde ligne des titres sur fond encre                |
| `--couleur-photo`             | `#ddd8cf`                 | Fond d'attente d'une photo                             |
| `--couleur-erreur`            | `#b3261e`                 | Messages d'erreur sur fond clair                       |
| `--couleur-erreur-claire`     | `#f2b8b5`                 | Messages d'erreur sur fond encre (contraste suffisant) |
| `--couleur-contour-sombre`    | `rgba(255, 255, 255, .5)` | Contour d'un bouton secondaire sur fond encre          |

### Typographie

Deux familles, chargées depuis Google Fonts dans `index.html` :

- `--police-titre` : **Bricolage Grotesque** ExtraBold (800), `font-variation-settings: 'opsz' 14, 'wdth' 100` ;
- `--police-texte` : **Geist** (300, 400, 500).

Chaque style Figma a trois tokens : `-taille`, `-interligne`, `-interlettre`. Les interlettrages
de Figma sont en **pourcentage** de la taille : « -4 » sur Titre/L donne `-0.04em`.

| Style Figma      | Tokens                | Taille  | Interligne | Interlettre |
| ---------------- | --------------------- | ------- | ---------- | ----------- |
| Titre/XL         | `--titre-xl-*`        | 160 px  | 0.86       | -0.045em    |
| Titre/L          | `--titre-l-*`         | 96 px   | 0.92       | -0.04em     |
| Titre/M          | `--titre-m-*`         | 56 px   | 1          | -0.03em     |
| Titre/S          | `--titre-s-*`         | 36 px   | 1.05       | -0.025em    |
| Titre/Carte      | `--titre-carte-*`     | 26 px   | 1.05       | -0.02em     |
| Mobile/Titre XL  | `--mobile-titre-xl-*` | 64 px   | 0.88       | -0.04em     |
| Mobile/Titre L   | `--mobile-titre-l-*`  | 44 px   | 0.95       | -0.03em     |
| Mobile/Titre M   | `--mobile-titre-m-*`  | 32 px   | 1          | -0.025em    |
| Texte/Intro      | `--texte-intro-*`     | 17 px   | 1.7        | — (300)     |
| Texte/Courant    | `--texte-*`           | 15 px   | 1.6        | —           |
| (chapô)          | `--texte-chapo-*`     | 16 px   | 1.7        | — (300)     |
| Texte/Petit      | `--texte-petit-*`     | 13 px   | 1.55       | —           |
| (aide, mentions) | `--texte-aide-taille` | 11.5 px | —          | —           |
| Texte/Bouton     | `--bouton-taille`     | 14 px   | 1          | — (500)     |
| Surtitre         | `--surtitre-*`        | 11 px   | 1.3        | 0.22em      |
| (titre de carte) | `--titre-bloc-*`      | 22 px   | 1.05       | -0.02em     |

`--titre-bloc` sert aux cartes de formulaire du compte (« Identité », « Connexion ») : la maquette
les utilise sans en faire un style des Fondations. Le logo (`BRUME`) est en Geist 500, 15 px,
interlettre `0.5em`.

### Espacements, formes, mise en page

| Token                | Valeur                        | Usage                                                         |
| -------------------- | ----------------------------- | ------------------------------------------------------------- |
| `--espace-1` à `-10` | 4 → 40 px                     | `1`=4, `2`=8, `3`=12, `4`=16, `5`=20, `6`=24, `8`=32, `10`=40 |
| `--espace-18`        | 72 px                         | Marge latérale ordinateur                                     |
| `--rayon-saisie`     | 8 px                          | Champs                                                        |
| `--rayon-carte`      | 10 px                         | Cartes                                                        |
| `--rayon-pilule`     | 999 px                        | Boutons, pastilles                                            |
| `--hauteur-saisie`   | 48 px                         | Champs                                                        |
| `--hauteur-bouton`   | 52 px                         | Boutons                                                       |
| `--hauteur-pastille` | 40 px                         | Pastilles                                                     |
| `--hauteur-menu`     | 64 px                         | Menu fixe : décalage des pages sous le menu                   |
| `--largeur-contenu`  | 1296 px                       | Largeur maximale du contenu (1440 - 2 × 72)                   |
| `--courbe-brume`     | `cubic-bezier(.2, .7, .1, 1)` | Courbe de toutes les animations (départ franc, arrivée douce) |

Conteneur de page habituel :

```scss
max-width: calc(var(--largeur-contenu) + 2 * var(--espace-18));
margin-inline: auto;
padding-inline: var(--espace-5); // mobile ; var(--espace-18) à partir de 1024 px
```

## Points de rupture et mixins

On écrit le **mobile d'abord**, puis on monte avec les mixins de `styles/_mixins.scss` :

```scss
@use '../../../styles/mixins' as m;

.grille {
  display: grid;

  @include m.a-partir-de-tablette {
    // ≥ 768 px
    grid-template-columns: repeat(2, 1fr);
  }

  @include m.a-partir-de-ordinateur {
    // ≥ 1024 px
    grid-template-columns: repeat(4, 1fr);
  }
}
```

Autres mixins : `m.surtitre` (style Surtitre complet) et `m.hors-ecran` (visible des lecteurs
d'écran seulement).

## Classes globales

Définies dans `styles.scss`, utilisables dans n'importe quel gabarit.

| Classe                 | Effet                                                                                    |
| ---------------------- | ---------------------------------------------------------------------------------------- |
| `.titre-xl`            | Mobile/Titre XL → Titre/XL à partir de 1024 px. Chaque `<span>` enfant passe à la ligne. |
| `.titre-l`             | Mobile/Titre L → Titre/L                                                                 |
| `.titre-m`             | Mobile/Titre M → Titre/M                                                                 |
| `.titre-s`             | Titre/S                                                                                  |
| `.titre-carte`         | Titre/Carte                                                                              |
| `.surtitre`            | Surtitre (petites capitales espacées)                                                    |
| `.texte-intro`         | Texte/Intro (17 px, graisse 300)                                                         |
| `.texte-chapo`         | Chapô (16 px, graisse 300)                                                               |
| `.texte-courant`       | Texte/Courant                                                                            |
| `.texte-petit`         | Texte/Petit                                                                              |
| `.texte-mention`       | Mentions légales, aides (11.5 px)                                                        |
| `.visuellement-masque` | Masqué à l'œil, lu par les lecteurs d'écran                                              |
| `.lien-fleche`         | Lien texte « Voir les thés → », souligné au survol                                       |
| `.mention-bientot`     | Pastille en pointillé pour une fonction **non livrée** : visible, jamais cliquable       |
| `.masque`              | Image révélée par un rideau (à combiner avec `appReveal`)                                |

Titre en deux lignes, seconde ligne en accent :

```html
<h2 class="titre-l">
  <span>Peu de choses.</span>
  <span class="accent">Les bonnes.</span>
  <!-- .accent défini dans le composant -->
</h2>
```

## Animations

Toutes reprises de la maquette HTML, toutes **neutralisées** si l'utilisateur a demandé à réduire
les animations (`prefers-reduced-motion`).

| Animation                   | Comment l'utiliser                                                                 |
| --------------------------- | ---------------------------------------------------------------------------------- |
| Apparition au défilement    | `appReveal` sur l'élément ; décalage avec `data-delai="1"` à `"3"`                 |
| Image révélée par un rideau | `<figure class="masque" appReveal><img …></figure>`                                |
| Remplissage des boutons     | Automatique sur `app-ui-button` (la couleur monte depuis le bas, la flèche glisse) |
| Zoom photo des cartes       | Automatique sur `app-ui-product-card` au survol                                    |
| Soulignement des liens      | `.lien-fleche` ; les liens du menu sont soulignés au survol et sur la page active  |
| Transition de vue           | `avecTransitionDeVue('transition-fondu', miseAJour, rendre)` (voir plus bas)       |

## Composants `shared/ui`

Composants **purement présentationnels** : des entrées, des sorties, aucun service métier, aucun
type de l'API. Utilisables par toutes les features.

### `app-ui-button` — « Bouton »

| Entrée              | Type                              | Défaut     | Rôle                                                                              |
| ------------------- | --------------------------------- | ---------- | --------------------------------------------------------------------------------- |
| `libelle`           | `string` (obligatoire)            | —          | Texte du bouton                                                                   |
| `variante`          | `'plein' \| 'contour' \| 'clair'` | `'plein'`  | Plein : action principale. Contour : secondaire. Clair : sur photo ou fond sombre |
| `type`              | `'button' \| 'submit'`            | `'button'` | Type du bouton                                                                    |
| `fleche`            | `boolean`                         | `false`    | Ajoute « → »                                                                      |
| `disabled`          | `boolean`                         | `false`    |                                                                                   |
| `occupe`            | `boolean`                         | `false`    | « Enregistrement… » et bouton bloqué                                              |
| `lien`              | `string \| null`                  | `null`     | Rend un lien (`routerLink`) à l'apparence de bouton                               |
| `params`            | `Params \| null`                  | `null`     | Paramètres d'URL du lien                                                          |
| **Sortie** `presse` | `void`                            |            | Clic (mode bouton)                                                                |

```html
<app-ui-button libelle="Enregistrer" type="submit" [occupe]="enregistrement()" />
<app-ui-button variante="clair" libelle="La boutique" [fleche]="true" lien="/boutique" />
```

### `app-ui-chip` — « Pastille »

Entrées : `libelle` (obligatoire), `actif` (`boolean`). Purement visuelle : pour la rendre
interactive, l'envelopper dans un `<button aria-pressed>` ou un lien.

```html
<button type="button" [attr.aria-pressed]="choisi" (click)="basculer()">
  <app-ui-chip libelle="Gingembre" [actif]="choisi" />
</button>
```

### `app-ui-card` — carte de contenu

Entrées : `titre` (obligatoire), `description`. Le contenu est projeté. Fond papier, filet, coins
arrondis, titre en `--titre-bloc`.

### `app-ui-field` — champ de formulaire

Entrées : `libelle`, `control` (`FormControl<string>`, obligatoires), `type` (`text`, `date`, `tel`,
`email`), `aide`, `erreur` (message affiché sous le champ), `autocomplete`, `obligatoire`.

### `app-ui-static-field` — valeur en lecture seule

Entrées : `libelle`, `valeur` (obligatoires), `iconeSrc` / `iconeAlt` (ex. logo Google), `aide`.
Pour une donnée qui ne se modifie pas depuis Brume (l'email du compte Google).

### `app-ui-product-card` — « Carte produit »

Photo au format 4:5. Avec `lien`, **toute la carte** est cliquable ; sans, c'est un aperçu.

| Entrée      | Type                   | Rôle                                      |
| ----------- | ---------------------- | ----------------------------------------- |
| `nom`       | `string` (obligatoire) |                                           |
| `prixCents` | `number` (obligatoire) | Formaté par `PricePipe` (« 24 € »)        |
| `photo`     | `string \| null`       |                                           |
| `origine`   | `string \| null`       | Petites capitales : « Vert · Uji, Japon » |
| `notes`     | `string \| null`       | « Herbacé · crémeux · umami »             |
| `moment`    | `string \| null`       | À droite des notes : « Matin »            |
| `badge`     | `string \| null`       | Pastille sur la photo : « Préféré »       |
| `lien`      | `string \| null`       | Route de la fiche                         |
| `params`    | `Params \| null`       | Paramètres d'URL du lien                  |

```html
<app-ui-product-card
  nom="Matcha cérémonie"
  [prixCents]="2400"
  photo="images/produits/matcha-ceremonie.jpg"
  origine="Vert · Uji, Japon"
  badge="Préféré"
  lien="/boutique"
  [params]="{ q: 'Matcha cérémonie' }"
/>
```

### `app-ui-step` — « Étape »

Bloc de « Comment ça marche ». Entrées : `numero` (« 01 »), `titre`, `texte` (obligatoires),
`photo` (facultative, 4:3). Le numéro est décoratif ; le titre est annoncé « Étape 01 : … ».

### `app-ui-faq-item` — « Question FAQ »

Entrée : `question`. La réponse est projetée. Bâti sur `<details>` / `<summary>` : ouverture au
clavier et état annoncé sans JavaScript.

```html
<app-ui-faq-item question="Je peux arrêter quand je veux ?">
  Oui, en un clic depuis ton compte.
</app-ui-faq-item>
```

## Cadre commun `layout/`

Monté une seule fois dans `App`, autour de toutes les pages.

| Composant         | Rôle                                                                                                                                                                                    |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app-site-header` | « Menu / Ordinateur » et « / Mobile » : fixe, **transparent** sur les pages à photo, **plein** dès qu'on défile ; panneau mobile en `<dialog>` ; lien d'évitement « Aller au contenu ». |
| `app-site-footer` | « Pied de page » : colonnes de liens, fonctions à venir marquées « bientôt ».                                                                                                           |
| `app-side-switch` | « Interrupteur Thé · Café » du menu, branché sur `SideStore`.                                                                                                                           |

Les entrées du menu et du pied de page sont déclarées dans `layout/navigation.ts`. Une entrée
`{ libelle, lien: null }` est une fonction **non livrée** : elle n'est jamais rendue en lien.

Chaque route pilote le cadre par ses `data` :

```ts
{ path: '', data: { menu: 'transparent' }, … }              // le menu se pose sur la photo
{ path: 'connexion', data: { menu: 'transparent', piedDePage: false }, … }
```

Sans `menu: 'transparent'`, la page est décalée de `--hauteur-menu` sous le menu plein.

## Directives, pipes et utilitaires

| Élément                                    | Où                  | Rôle                                                                                                                   |
| ------------------------------------------ | ------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `appReveal` (`RevealDirective`)            | `shared/directives` | Ajoute `est-visible` quand l'élément entre à l'écran (une fois)                                                        |
| `price` (`PricePipe`)                      | `shared/pipes`      | Centimes → « 24 € » / « 12,90 € » ; le front ne recalcule jamais                                                       |
| `avecTransitionDeVue(classe, maj, rendre)` | `shared/utils`      | Joue une mise à jour dans une transition de vue si le navigateur la connaît et que les animations ne sont pas réduites |

`avecTransitionDeVue` : `classe` (`transition-fondu`, `transition-intro`) choisit l'animation
définie dans `styles.scss` ; `rendre` doit appliquer la mise à jour au DOM tout de suite, en
pratique `() => inject(ApplicationRef).tick()`.

## Ajouter un token ou un composant

1. **Un token** : dans `styles/_tokens.scss`, avec le nom Figma et un commentaire d'usage s'il
   n'est pas évident ; puis dans le tableau ci-dessus.
2. **Un composant réutilisable** : `npx ng generate component shared/ui/ui-xxx`, préfixe `ui-`,
   `ChangeDetectionStrategy.OnPush`, entrées en `input()`, aucun service ni type métier ; un
   `*.spec.ts` qui teste ce que voit l'utilisateur ; une section dans ce document.
3. Un composant qui ne sert qu'à une feature reste dans `features/<domaine>/components/` : il ne
   monte dans `shared/ui` que le jour où une deuxième feature en a besoin.

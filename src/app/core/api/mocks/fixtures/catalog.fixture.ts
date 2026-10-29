import type { CatalogProduct, Category } from '../../api.types';

/**
 * Catalogue simulé, repris de `docs/contract/seed.json` de `brume_back` :
 * mêmes identifiants, mêmes noms, mêmes prix et mêmes stocks. Le jour où le
 * back répond, les données coïncident et rien ne bouge à l'écran.
 *
 * Ce fichier est GÉNÉRÉ depuis le seed, puis complété à la main pour les
 * quatre champs hors contrat (`moment`, `caffeine`, `origin`, `tastingNotes`) :
 * voir le bloc « HORS CONTRAT » de `api.types.ts`. Les regénérer veut dire
 * reprendre le script de la PR SCRUM-66, pas éditer les prix ici.
 *
 * `fromPriceCents` est le prix de la variante active la moins chère et
 * `availability` se déduit du stock (> 5 `IN_STOCK`, 1 à 5 `LOW_STOCK`,
 * 0 `OUT_OF_STOCK`), exactement comme le décrit `openapi.yaml`.
 *
 * Les URL d'images pointent vers le CDN du contrat, qui n'existe pas encore :
 * la carte produit affiche un aplat de repli quand l'image ne charge pas.
 */

export const CATEGORIES_FIXTURE: readonly Category[] = [
  {
    id: 'c0000000-0000-4000-8000-000000000001',
    name: 'Thés',
    slug: 'thes',
    description: 'Thés noirs, verts, blancs et infusions.',
    parentId: null,
    position: 1,
  },
  {
    id: 'c0000000-0000-4000-8000-000000000002',
    name: 'Cafés',
    slug: 'cafes',
    description: 'Cafés de spécialité, en grains ou moulus.',
    parentId: null,
    position: 2,
  },
  {
    id: 'c0000000-0000-4000-8000-000000000003',
    name: 'CBD',
    slug: 'cbd',
    description: 'Produits au CBD, THC ≤ 0,3 %. Réservés aux personnes majeures.',
    parentId: null,
    position: 3,
  },
  {
    id: 'c0000000-0000-4000-8000-000000000004',
    name: 'Box & coffrets',
    slug: 'box-coffrets',
    description: 'TEA-BOX et coffrets.',
    parentId: null,
    position: 4,
  },
  {
    id: 'c0000000-0000-4000-8000-000000000005',
    name: 'Accessoires',
    slug: 'accessoires',
    description: 'Théières, tasses et infuseurs.',
    parentId: null,
    position: 5,
  },
];

/**
 * Les produits archivés figurent ici parce qu'ils sont dans le seed, mais
 * `GET /products` les exclut (« Les produits archivés sont exclus ») : c'est
 * l'implémentation simulée qui applique la règle, pas la fixture qui les cache.
 */
export const PRODUITS_ARCHIVES: readonly string[] = ['darjeeling-printemps-2025'];

export const PRODUCTS_FIXTURE: readonly CatalogProduct[] = [
  {
    id: 'a0000000-0000-4000-8000-000000000001',
    slug: 'earl-grey-imperial',
    name: 'Earl Grey Impérial',
    type: 'TEA',
    shortDescription: 'Thé noir à la bergamote de Calabre.',
    category: { id: 'c0000000-0000-4000-8000-000000000001', name: 'Thés', slug: 'thes' },
    image: {
      url: 'https://cdn.brume.dev/products/earl-grey-imperial-1.jpg',
      alt: 'Earl Grey Impérial en vrac',
    },
    fromPriceCents: 790,
    availability: 'IN_STOCK',
    ageRestricted: false,
    moment: 'MORNING',
    caffeine: 'HIGH',
    origin: 'Inde, Darjeeling',
    tastingNotes: 'Bergamote · agrume · tanin',
  },
  {
    id: 'a0000000-0000-4000-8000-000000000002',
    slug: 'sencha-bio',
    name: 'Sencha Bio',
    type: 'TEA',
    shortDescription: 'Thé vert japonais, notes végétales et iodées.',
    category: { id: 'c0000000-0000-4000-8000-000000000001', name: 'Thés', slug: 'thes' },
    image: null,
    fromPriceCents: 1490,
    availability: 'OUT_OF_STOCK',
    ageRestricted: false,
    moment: 'MORNING',
    caffeine: 'MEDIUM',
    origin: 'Japon, Shizuoka',
    tastingNotes: 'Herbacé · iodé · végétal',
  },
  {
    id: 'a0000000-0000-4000-8000-000000000003',
    slug: 'ethiopie-moka-sidamo',
    name: 'Éthiopie Moka Sidamo',
    type: 'COFFEE',
    shortDescription: "Arabica floral, notes de jasmin et d'agrumes.",
    category: { id: 'c0000000-0000-4000-8000-000000000002', name: 'Cafés', slug: 'cafes' },
    image: null,
    fromPriceCents: 990,
    availability: 'IN_STOCK',
    ageRestricted: false,
    moment: 'MORNING',
    caffeine: 'HIGH',
    origin: 'Éthiopie, Sidamo',
    tastingNotes: 'Fruits rouges · floral · miel',
  },
  {
    id: 'a0000000-0000-4000-8000-000000000004',
    slug: 'fleurs-cbd-amnesia',
    name: 'Fleurs CBD Amnesia',
    type: 'CBD',
    shortDescription: 'Fleurs de chanvre, 12 % CBD, THC < 0,3 %.',
    category: { id: 'c0000000-0000-4000-8000-000000000003', name: 'CBD', slug: 'cbd' },
    image: {
      url: 'https://cdn.brume.dev/products/fleurs-cbd-amnesia-1.jpg',
      alt: 'Fleurs CBD Amnesia',
    },
    fromPriceCents: 1490,
    availability: 'IN_STOCK',
    ageRestricted: true,
    moment: 'EVENING',
    caffeine: 'NONE',
    origin: 'France',
    tastingNotes: 'Résineux · poivré · doux',
  },
  {
    id: 'a0000000-0000-4000-8000-000000000005',
    slug: 'tea-box-decouverte-automne',
    name: 'TEA-BOX Découverte — Automne',
    type: 'BOX',
    shortDescription: "Trois références choisies par l'équipe pour l'automne.",
    category: {
      id: 'c0000000-0000-4000-8000-000000000004',
      name: 'Box & coffrets',
      slug: 'box-coffrets',
    },
    image: null,
    fromPriceCents: 2990,
    availability: 'IN_STOCK',
    ageRestricted: false,
    moment: 'ANYTIME',
    caffeine: 'MEDIUM',
    origin: null,
    tastingNotes: 'Quatre thés · épices · douceur',
  },
  {
    id: 'a0000000-0000-4000-8000-000000000006',
    slug: 'theiere-fonte-kyoto',
    name: 'Théière en fonte Kyoto',
    type: 'ACCESSORY',
    shortDescription: 'Théière en fonte émaillée, 0,8 L, filtre inox.',
    category: {
      id: 'c0000000-0000-4000-8000-000000000005',
      name: 'Accessoires',
      slug: 'accessoires',
    },
    image: null,
    fromPriceCents: 3490,
    availability: 'LOW_STOCK',
    ageRestricted: false,
    moment: 'ANYTIME',
    caffeine: 'NONE',
    origin: null,
    tastingNotes: 'Fonte émaillée · 800 ml',
  },
  {
    id: 'a0000000-0000-4000-8000-000000000007',
    slug: 'darjeeling-printemps-2025',
    name: 'Darjeeling First Flush 2025',
    type: 'TEA',
    shortDescription: 'Récolte 2025, retiré de la vente (exemple de produit archivé).',
    category: { id: 'c0000000-0000-4000-8000-000000000001', name: 'Thés', slug: 'thes' },
    image: null,
    fromPriceCents: 1890,
    availability: 'OUT_OF_STOCK',
    ageRestricted: false,
    moment: 'AFTERNOON',
    caffeine: 'HIGH',
    origin: 'Inde, Darjeeling',
    tastingNotes: 'Muscat · fleur · vif',
  },
];

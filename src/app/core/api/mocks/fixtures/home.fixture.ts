/**
 * Vitrine simulée de l'accueil : textes, prix et sélections de la maquette Figma
 * (page « Accueil ») et de la maquette HTML (variantes thé / café).
 * Photos de la « Banque d'images » Figma, servies depuis `public/images/produits`.
 */
import type { Side } from '../../../state/side.store';
import type { HomeShowcase, ShowcaseMoment, ShowcaseProduct } from '../../home.service';

const produit = (
  slug: string,
  name: string,
  priceCents: number,
  origin: string,
  notes: string,
  moment: string,
  badge: string | null = null,
): ShowcaseProduct => ({
  slug,
  name,
  priceCents,
  image: `images/produits/${slug}.jpg`,
  origin,
  notes,
  moment,
  badge,
});

const P = {
  matcha: produit(
    'matcha-ceremonie',
    'Matcha cérémonie',
    2400,
    'Vert · Uji, Japon',
    'Herbacé · crémeux · umami',
    'Matin',
    'Préféré',
  ),
  espresso: produit(
    'espresso-maison',
    'Espresso maison',
    1200,
    'Espresso · Brésil · Éthiopie',
    'Praliné · fruits rouges',
    'Matin',
    'Nouveau',
  ),
  earlGrey: produit(
    'earl-grey-au-chanvre',
    'Earl grey au chanvre',
    1600,
    'Thé au CBD · Ceylan',
    'Bergamote · boisé · rond',
    'Goûter',
  ),
  longJing: produit(
    'long-jing',
    'Long Jing',
    2600,
    'Vert · Hangzhou, Chine',
    'Châtaigne · beurré · soyeux',
    'Midi',
  ),
  hojicha: produit(
    'hojicha-du-soir',
    'Hojicha du soir',
    1600,
    'Vert · Shizuoka, Japon',
    'Torréfié · noisette · caramel',
    'Soir',
    'Peu caféiné',
  ),
  darjeeling: produit(
    'darjeeling-first-flush',
    'Darjeeling first flush',
    2200,
    'Noir · Darjeeling, Inde',
    'Muscat · floral · sec',
    'Goûter',
  ),
  ethiopie: produit(
    'ethiopie-yirgacheffe',
    'Éthiopie Yirgacheffe',
    1700,
    'Filtre · Yirgacheffe, Éthiopie',
    'Jasmin · bergamote · pêche',
    'Matin',
  ),
  kenya: produit(
    'kenya-aa',
    'Kenya AA',
    1900,
    'Filtre · Nyeri, Kenya',
    'Cassis · tomate · vif',
    'Goûter',
    'Rare',
  ),
  sencha: produit(
    'sencha-du-matin',
    'Sencha du matin',
    1500,
    'Vert · Shizuoka, Japon',
    'Iodé · frais · végétal',
    'Matin',
  ),
  genmaicha: produit(
    'genmaicha',
    'Genmaicha',
    1300,
    'Vert · Kyoto, Japon',
    'Riz soufflé · pain grillé',
    'Midi',
  ),
  chai: produit(
    'chai-maison',
    'Chaï maison',
    1500,
    'Noir · Assam, Inde',
    'Cannelle · cardamome · gingembre',
    'Goûter',
  ),
  colombie: produit(
    'colombie-huila',
    'Colombie Huila',
    1500,
    'Filtre · Huila, Colombie',
    'Caramel · pomme rouge · doux',
    'Midi',
  ),
  deca: produit(
    'decafeine-perou',
    'Décaféiné Pérou',
    1500,
    'Décaféiné · Cajamarca, Pérou',
    'Noisette · miel · sans solvant',
    'Soir',
    'Sans caféine',
  ),
  theBlanc: produit(
    'the-blanc-au-chanvre',
    'Thé blanc au chanvre',
    1900,
    'Thé au CBD · Fujian',
    'Miel · foin · doux',
    'Soir',
    'Nouveau',
  ),
} as const;

const moment = (
  hour: string,
  label: string,
  product: ShowcaseProduct,
  caption: string,
): ShowcaseMoment => ({ hour, label, product, caption });

/** Clé `neutre` : aucun côté choisi. */
export const mockShowcases: Record<Side | 'neutre', HomeShowcase> = {
  neutre: {
    favorites: [P.matcha, P.espresso, P.earlGrey, P.longJing],
    moments: [
      moment('8h', 'Le réveil', P.espresso, 'Espresso · caféine forte'),
      moment('12h', 'La pause', P.genmaicha, 'Thé vert · caféine moyenne'),
      moment('16h', 'Le goûter', P.ethiopie, 'Café filtre · léger'),
      moment('21h', 'Le cocon', P.theBlanc, 'Thé au CBD · peu de caféine'),
    ],
  },
  the: {
    favorites: [P.matcha, P.hojicha, P.longJing, P.darjeeling],
    moments: [
      moment('8h', 'Le réveil', P.sencha, 'Thé vert · caféine forte'),
      moment('12h', 'La pause', P.genmaicha, 'Thé vert · caféine moyenne'),
      moment('16h', 'Le goûter', P.chai, 'Thé noir épicé · au lait'),
      moment('21h', 'Le cocon', P.hojicha, 'Thé torréfié · peu de caféine'),
    ],
  },
  cafe: {
    favorites: [P.espresso, P.ethiopie, P.kenya, P.hojicha],
    moments: [
      moment('8h', 'Le réveil', P.espresso, 'Espresso · corsé'),
      moment('12h', 'La pause', P.colombie, 'Filtre · rond et sucré'),
      moment('16h', 'Le goûter', P.ethiopie, 'Filtre · floral'),
      moment('21h', 'Le soir', P.deca, 'Décaféiné · sans caféine'),
    ],
  },
};

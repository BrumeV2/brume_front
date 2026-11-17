import type { Availability, Variant } from '../../api.types';

/**
 * Formats simulés des produits de `catalog.fixture.ts`.
 *
 * Le premier format de chaque produit est le moins cher et vaut son
 * `fromPriceCents`, comme le contrat le définit (« prix de la variante la
 * moins chère »). Ceux du Matcha cérémonie sont ceux de la maquette
 * (Boîte 50 g · 24 €, Boîte 100 g · 42 €, Recharge 100 g · 36 €).
 *
 * `stock` n'existe pas au contrat : l'API ne renvoie qu'une `availability`.
 * Il ne sert qu'à l'implémentation simulée du panier, pour qu'elle refuse un
 * ajout au-delà du stock comme le back (`409 OUT_OF_STOCK`).
 */
export interface MockVariant extends Variant {
  readonly productId: string;
  readonly stock: number;
}

/** Seuil sous lequel un format est annoncé « stock faible ». */
const SEUIL_STOCK_FAIBLE = 5;

function disponibilite(stock: number): Availability {
  if (stock === 0) return 'OUT_OF_STOCK';
  return stock < SEUIL_STOCK_FAIBLE ? 'LOW_STOCK' : 'IN_STOCK';
}

/** `b0000000-…-0000000001 02` : produit n° 1, format n° 2. */
function idVariante(produit: number, format: number): string {
  const suffixe = `${String(produit).padStart(2, '0')}${String(format).padStart(2, '0')}`;
  return `b0000000-0000-4000-8000-00000000${suffixe}`;
}

type Format = readonly [
  sku: string,
  label: string,
  priceCents: number,
  weightGrams: number,
  stock: number,
];

function formats(produit: number, liste: readonly Format[]): MockVariant[] {
  return liste.map(([sku, label, priceCents, weightGrams, stock], index) => ({
    id: idVariante(produit, index + 1),
    productId: `a0000000-0000-4000-8000-0000000000${String(produit).padStart(2, '0')}`,
    sku,
    label,
    priceCents,
    weightGrams,
    stock,
    availability: disponibilite(stock),
  }));
}

export const VARIANTS_FIXTURE: readonly MockVariant[] = [
  ...formats(1, [
    ['MAT-50G', 'Boîte 50 g', 2400, 50, 40],
    ['MAT-100G', 'Boîte 100 g', 4200, 100, 40],
    // Stock faible : sert à démontrer le refus d'un ajout au-delà du stock.
    ['MAT-REC-100G', 'Recharge 100 g', 3600, 100, 3],
  ]),
  ...formats(2, [
    ['SEN-50G', 'Boîte 50 g', 1500, 50, 40],
    ['SEN-100G', 'Boîte 100 g', 2600, 100, 40],
  ]),
  ...formats(3, [
    ['LJ-50G', 'Boîte 50 g', 2600, 50, 3],
    ['LJ-100G', 'Boîte 100 g', 4600, 100, 0],
  ]),
  ...formats(4, [
    ['GEN-100G', 'Boîte 100 g', 1300, 100, 40],
    ['GEN-REC-200G', 'Recharge 200 g', 2200, 200, 40],
  ]),
  ...formats(5, [
    ['DAR-50G', 'Boîte 50 g', 2200, 50, 40],
    ['DAR-100G', 'Boîte 100 g', 3900, 100, 40],
  ]),
  ...formats(6, [
    ['CHAI-100G', 'Boîte 100 g', 1500, 100, 40],
    ['CHAI-250G', 'Sachet 250 g', 3200, 250, 40],
  ]),
  ...formats(7, [
    ['HOJ-50G', 'Boîte 50 g', 1600, 50, 40],
    ['HOJ-100G', 'Boîte 100 g', 2800, 100, 40],
  ]),
  ...formats(8, [
    ['ESP-250G-G', '250 g · en grains', 1200, 250, 40],
    ['ESP-250G-M', '250 g · moulu', 1200, 250, 40],
    ['ESP-1KG-G', '1 kg · en grains', 4200, 1000, 40],
  ]),
  ...formats(9, [
    ['ETH-250G-G', '250 g · en grains', 1700, 250, 40],
    ['ETH-250G-M', '250 g · moulu', 1700, 250, 40],
  ]),
  ...formats(10, [
    ['COL-250G-G', '250 g · en grains', 1500, 250, 40],
    ['COL-250G-M', '250 g · moulu', 1500, 250, 40],
  ]),
  ...formats(11, [
    ['KEN-250G-G', '250 g · en grains', 1900, 250, 0],
    ['KEN-250G-M', '250 g · moulu', 1900, 250, 0],
  ]),
  ...formats(12, [
    ['DEC-250G-G', '250 g · en grains', 1500, 250, 40],
    ['DEC-250G-M', '250 g · moulu', 1500, 250, 40],
  ]),
  ...formats(13, [
    ['EGC-30G', '30 g', 1600, 30, 40],
    ['EGC-60G', '60 g', 2900, 60, 40],
  ]),
  ...formats(14, [
    ['TBC-30G', '30 g', 1900, 30, 3],
    ['TBC-60G', '60 g', 3400, 60, 0],
  ]),
  ...formats(15, [['OOL-50G', 'Boîte 50 g', 2800, 50, 0]]),
];

/** Formats d'un produit, dans l'ordre de la fiche, sans le stock interne. */
export function variantesDuProduit(productId: string): Variant[] {
  return VARIANTS_FIXTURE.filter((variante) => variante.productId === productId).map(
    ({ productId: _productId, stock: _stock, ...variante }) => variante,
  );
}

import { Pipe, PipeTransform } from '@angular/core';

const EUROS_RONDS = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

const EUROS_CENTIMES = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
});

/**
 * Centimes (format de l'API) → prix affiché : `2400` → « 24 € », `1290` → « 12,90 € ».
 *
 * Les montants restent des entiers en centimes jusqu'ici : le front formate, il
 * ne recalcule jamais.
 */
@Pipe({ name: 'price' })
export class PricePipe implements PipeTransform {
  transform(cents: number | null | undefined): string {
    if (cents === null || cents === undefined || !Number.isFinite(cents)) {
      return '';
    }
    const format = cents % 100 === 0 ? EUROS_RONDS : EUROS_CENTIMES;
    return format.format(cents / 100);
  }
}

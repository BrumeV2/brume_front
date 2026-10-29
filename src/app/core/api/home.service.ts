import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import type { Side } from '../state/side.store';

/*
 * HORS CONTRAT — le contrat d'API (`openapi.yaml`) n'a pas encore de route pour
 * la vitrine de l'accueil. Ces types et ce service décrivent ce dont la page a
 * besoin ; seule l'implémentation simulée existe. À rebrancher sur le catalogue
 * (produits mis en avant) quand le back sera prêt.
 */

/** Un produit tel que l'accueil le montre. Champs nommés comme ceux du catalogue. */
export interface ShowcaseProduct {
  readonly slug: string;
  readonly name: string;
  readonly priceCents: number;
  readonly image: string;
  /** Type et origine, ex. « Vert · Uji, Japon ». */
  readonly origin: string;
  readonly notes: string;
  readonly moment: string;
  readonly badge: string | null;
}

/** Une heure de la journée et la tasse qui va avec (« Une tasse pour chaque heure »). */
export interface ShowcaseMoment {
  readonly hour: string;
  readonly label: string;
  readonly product: ShowcaseProduct;
  readonly caption: string;
}

export interface HomeShowcase {
  readonly favorites: readonly ShowcaseProduct[];
  readonly moments: readonly ShowcaseMoment[];
}

/** Vitrine de l'accueil, qui varie selon le côté choisi (thé, café ou neutre). */
@Injectable()
export abstract class HomeService {
  abstract getShowcase(side: Side | null): Observable<HomeShowcase>;
}

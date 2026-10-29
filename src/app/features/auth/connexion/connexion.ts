import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Fournisseurs } from '../fournisseurs/fournisseurs';

const photo = (nom: string) => `images/auth/${nom}.jpg`;

/** Maquette « Connexion — ordinateur / mobile ». */
@Component({
  selector: 'app-connexion',
  imports: [RouterLink, Fournisseurs],
  templateUrl: './connexion.html',
  styleUrl: './connexion.scss',
})
export class Connexion {
  // Mosaïque ordinateur : trois colonnes en quinconce. Les proportions des
  // hauteurs sont dans connexion.scss (la mosaïque suit la hauteur de l'écran).
  protected readonly colonnes = [
    [
      { src: photo('matcha-ceremonie'), etiquette: 'Thé · Uji' },
      { src: photo('rose') },
      { src: photo('cacao') },
    ],
    [
      { src: photo('bresil-cerrado'), etiquette: 'Café · Cerrado' },
      { src: photo('ethiopie-yirgacheffe') },
      { src: photo('cardamome') },
    ],
    [
      { src: photo('sencha-chanvre'), etiquette: 'Chanvre · Sarthe' },
      { src: photo('jasmin-perles') },
      { src: photo('oolong-lait') },
    ],
  ];

  // Mosaïque mobile : cinq photos placées librement (en % d'un cadre 370 × 360).
  protected readonly mosaiqueMobile = [
    { src: photo('matcha-ceremonie'), x: 0, y: 0, l: 170, h: 200 },
    { src: photo('bresil-cerrado'), x: 180, y: 40, l: 190, h: 170 },
    { src: photo('sencha-chanvre'), x: 0, y: 210, l: 120, h: 150 },
    { src: photo('cannelle'), x: 130, y: 220, l: 110, h: 110 },
    { src: photo('rose'), x: 250, y: 220, l: 120, h: 140 },
  ];

  protected readonly avantages = [
    { src: photo('box-selection'), libelle: 'Tes commandes' },
    { src: photo('box-custom'), libelle: 'Ta TEA-BOX' },
    { src: photo('matin-dore'), libelle: 'Tes mélanges' },
    { src: photo('box-tournoi'), libelle: 'Ton vote' },
  ];

  protected pourcent(valeur: number, total: number): string {
    return `${(valeur / total) * 100}%`;
  }
}

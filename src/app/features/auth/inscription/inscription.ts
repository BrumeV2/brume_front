import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Fournisseurs } from '../fournisseurs/fournisseurs';

/**
 * Maquette « Inscription — ordinateur / mobile ».
 * Côté API, inscription et connexion sont le même parcours Google : un premier
 * passage crée le compte, les suivants le retrouvent.
 */
@Component({
  selector: 'app-inscription',
  imports: [RouterLink, Fournisseurs],
  templateUrl: './inscription.html',
  styleUrl: './inscription.scss',
})
export class Inscription {
  protected readonly univers = [
    { nom: 'Thé', detail: '25 références', src: 'images/auth/univers-the.jpg' },
    { nom: 'Café', detail: 'torréfié le mardi', src: 'images/auth/bresil-cerrado.jpg' },
    { nom: 'CBD', detail: 'chanvre de la Sarthe', src: 'images/auth/sencha-chanvre.jpg' },
  ];

  protected readonly avantages = [
    { titre: 'Livraison offerte', detail: 'dès 40 €' },
    { titre: 'Tes mélanges', detail: 'enregistrés' },
    { titre: 'La Bataille', detail: 'tu votes' },
  ];
}

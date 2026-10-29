import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * « Question FAQ » de la maquette : question repliée, cliquer pour déplier la réponse.
 *
 * Bâtie sur `<details>` / `<summary>` : ouverture au clavier (Entrée, Espace),
 * état annoncé par les lecteurs d'écran, sans JavaScript. La réponse est
 * projetée : `<app-ui-faq-item question="…">Réponse…</app-ui-faq-item>`.
 */
@Component({
  selector: 'app-ui-faq-item',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ui-faq-item.html',
  styleUrl: './ui-faq-item.scss',
})
export class UiFaqItem {
  readonly question = input.required<string>();
}

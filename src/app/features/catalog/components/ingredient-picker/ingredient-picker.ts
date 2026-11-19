import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, map, of, switchMap, tap, timer } from 'rxjs';

import type { IngredientListItem } from '../../../../core/api/api.types';
import { CATALOG_RULES } from '../../../../core/api/catalog-rules';
import { IngredientsService } from '../../../../core/api/ingredients.service';
import { nettoyerRecherche, synonymesTrouves } from '../../../../core/api/product-search';

/** Attente après la dernière frappe avant d'interroger l'API. */
export const DELAI_SAISIE_MS = 250;

type Etat = 'repos' | 'trop-court' | 'recherche' | 'resultats' | 'aucun' | 'echec';

interface Reponse {
  readonly texte: string;
  readonly etat: Etat;
  readonly liste: readonly IngredientListItem[];
}

let suivant = 0;

/**
 * Recherche par ingrédient (US-015) : un champ qui propose les ingrédients du
 * référentiel au fil de la saisie.
 *
 * La correspondance est celle de `GET /ingredients?q=` : nom **ou** synonyme,
 * sans casse ni accents. Quand c'est un synonyme qui a trouvé l'ingrédient, la
 * suggestion le dit (« aussi appelé badiane ») : sinon « badiane » proposant
 * « Anis étoilé » ressemble à une erreur.
 *
 * Le composant ne touche ni à l'URL ni au catalogue : il annonce l'ingrédient
 * choisi, et la page décide.
 */
@Component({
  selector: 'app-ingredient-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ingredient-picker.html',
  styleUrl: './ingredient-picker.scss',
  host: { '(document:click)': 'fermerSiDehors($event)' },
})
export class IngredientPicker {
  private readonly ingredientsService = inject(IngredientsService);
  private readonly hote = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly frappes = new Subject<string>();

  /** Ingrédients déjà posés : proposés quand même, mais signalés et inertes. */
  readonly choisis = input<readonly string[]>([]);
  readonly choix = output<IngredientListItem>();

  protected readonly id = `ingredient-${++suivant}`;
  protected readonly maximum = CATALOG_RULES.ingredients.max;
  protected readonly longueurMax = CATALOG_RULES.ingredientSearch.maxLength;

  protected readonly saisie = signal('');
  protected readonly etat = signal<Etat>('repos');
  protected readonly texteCherche = signal('');
  protected readonly suggestions = signal<readonly IngredientListItem[]>([]);
  protected readonly active = signal(-1);
  protected readonly ouvert = signal(false);

  protected readonly complet = computed(() => this.choisis().length >= this.maximum);
  protected readonly idActive = computed(() =>
    this.ouvert() && this.etat() === 'resultats' && this.active() >= 0
      ? `${this.id}-option-${this.active()}`
      : null,
  );

  constructor() {
    this.frappes
      .pipe(
        map(nettoyerRecherche),
        // Une nouvelle frappe annule la recherche précédente : seule la
        // dernière saisie peut afficher ses suggestions.
        switchMap((texte) =>
          texte.length < CATALOG_RULES.ingredientSearch.minLength
            ? of<Reponse>({ texte, etat: texte === '' ? 'repos' : 'trop-court', liste: [] })
            : timer(DELAI_SAISIE_MS).pipe(
                tap(() => this.etat.set('recherche')),
                switchMap(() => this.ingredientsService.search(texte)),
                map((liste): Reponse => ({
                  texte,
                  etat: liste.length ? 'resultats' : 'aucun',
                  liste,
                })),
                catchError(() => of<Reponse>({ texte, etat: 'echec', liste: [] })),
              ),
        ),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe(({ texte, etat, liste }) => {
        this.texteCherche.set(texte);
        this.suggestions.set(liste);
        this.active.set(-1);
        this.etat.set(etat);
        this.ouvert.set(etat !== 'repos');
      });
  }

  protected saisir(texte: string): void {
    this.saisie.set(texte);
    this.frappes.next(texte);
  }

  protected relancer(): void {
    this.frappes.next(this.saisie());
  }

  protected dejaChoisi(ingredient: IngredientListItem): boolean {
    return this.choisis().includes(ingredient.id);
  }

  protected synonymes(ingredient: IngredientListItem): string {
    return synonymesTrouves(ingredient, this.texteCherche()).join(', ');
  }

  protected nombreDeProduits(ingredient: IngredientListItem): string {
    const n = ingredient.productCount;
    if (n === 0) return 'Aucun produit pour l’instant';
    return n === 1 ? '1 produit' : `${n} produits`;
  }

  protected choisir(ingredient: IngredientListItem): void {
    if (this.dejaChoisi(ingredient) || this.complet()) return;
    this.choix.emit(ingredient);
    this.saisir('');
  }

  protected clavier(evenement: KeyboardEvent): void {
    const liste = this.etat() === 'resultats' ? this.suggestions() : [];
    switch (evenement.key) {
      case 'ArrowDown':
        evenement.preventDefault();
        if (!this.ouvert() && this.etat() !== 'repos') this.ouvert.set(true);
        this.active.update((i) => Math.min(liste.length - 1, i + 1));
        break;
      case 'ArrowUp':
        evenement.preventDefault();
        this.active.update((i) => Math.max(-1, i - 1));
        break;
      case 'Enter': {
        evenement.preventDefault();
        // Sans flèche, Entrée prend la suggestion quand il n'y en a qu'une.
        const cible = liste[this.active()] ?? (liste.length === 1 ? liste[0] : undefined);
        if (cible !== undefined) this.choisir(cible);
        break;
      }
      case 'Escape':
        if (this.ouvert()) {
          evenement.preventDefault();
          this.ouvert.set(false);
        }
        break;
    }
  }

  protected rouvrir(): void {
    if (this.etat() !== 'repos') this.ouvert.set(true);
  }

  protected fermerSiDehors(evenement: Event): void {
    const cible = evenement.target;
    if (this.ouvert() && cible instanceof Node && !this.hote.nativeElement.contains(cible)) {
      this.ouvert.set(false);
    }
  }
}

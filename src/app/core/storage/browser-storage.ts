import { InjectionToken } from '@angular/core';

/**
 * Accès au stockage local du navigateur, injecté plutôt qu'utilisé en global.
 *
 * Deux raisons : les tests fournissent un stockage en mémoire sans dépendre de
 * l'environnement d'exécution, et un rendu côté serveur pourra fournir une
 * implémentation neutre.
 *
 * Toute lecture ou écriture reste entourée d'un `try` / `catch` : en navigation
 * privée ou quota atteint, l'accès lève une exception.
 */
export const BROWSER_STORAGE = new InjectionToken<Storage>('BROWSER_STORAGE', {
  providedIn: 'root',
  factory: () => localStorage,
});

/** Même principe pour le stockage de session : oublié à la fermeture de l'onglet. */
export const SESSION_STORAGE = new InjectionToken<Storage>('SESSION_STORAGE', {
  providedIn: 'root',
  factory: () => sessionStorage,
});

/** Stockage en mémoire, utilisé dans les tests et comme repli. */
export class InMemoryStorage implements Storage {
  private readonly entries = new Map<string, string>();

  get length(): number {
    return this.entries.size;
  }

  clear(): void {
    this.entries.clear();
  }

  getItem(key: string): string | null {
    return this.entries.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.entries.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.entries.delete(key);
  }

  setItem(key: string, value: string): void {
    this.entries.set(key, value);
  }
}

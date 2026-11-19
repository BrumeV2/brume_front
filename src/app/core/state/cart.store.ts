import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { toApiError, type ApiError, type ApiErrorCode } from '../api/api-error';
import type { AddCartItemRequest, Cart, CatalogProductDetail, Variant } from '../api/api.types';
import { CART_RULES } from '../api/cart-rules';
import { CartService } from '../api/cart.service';
import { ProductsService } from '../api/products.service';
import { AuthService } from '../auth/auth.service';
import { formatCents } from '../../shared/pipes/price-pipe';
import { BROWSER_STORAGE } from '../storage/browser-storage';

/** Clé du panier visiteur dans le `localStorage` (D-017). */
export const GUEST_CART_KEY = 'brume.panier.visiteur';

/**
 * Ligne du panier visiteur, telle qu'elle est stockée : la variante et la
 * quantité, **jamais de prix** (D-017). Le `slug` permet de redemander au
 * catalogue le nom, le format et le prix à afficher.
 */
export interface GuestLine {
  readonly variantId: string;
  readonly quantity: number;
  readonly productSlug: string;
}

/** Ce que le catalogue dit d'une variante, pour l'afficher dans le panier visiteur. */
interface VariantPreview {
  readonly productName: string;
  readonly productSlug: string;
  readonly variantLabel: string;
  readonly imageUrl: string | null;
  readonly unitPriceCents: number;
}

/** Où en est une ligne : stable, quantité en cours d'envoi, ou suppression en cours. */
export type CartLineState = 'stable' | 'updating' | 'removing';

/**
 * Ligne de panier telle que le tiroir l'affiche, quel que soit le panier.
 *
 * Les montants sont ceux de l'API. Pour un visiteur, il n'y a pas de total de
 * ligne : le front ne recalcule jamais un montant, et seul `GET /cart` en
 * donne un, une fois connecté.
 *
 * Pendant une modification, `quantity` montre déjà la quantité demandée mais
 * `lineTotalCents` reste celui de la dernière réponse : `state` le signale.
 */
export interface CartLine {
  /** Identifiant de la ligne sur l'API ; `null` dans un panier visiteur. */
  readonly itemId: string | null;
  readonly variantId: string;
  readonly productName: string;
  readonly productSlug: string;
  readonly variantLabel: string;
  readonly imageUrl: string | null;
  readonly quantity: number;
  readonly unitPriceCents: number | null;
  readonly lineTotalCents: number | null;
  readonly state: CartLineState;
  /** Dernier refus sur cette ligne (quantité, suppression), à afficher tel quel. */
  readonly error: string | null;
}

/**
 * Fiabilité du total affiché (US-024) :
 * - `confirmed` : dernière réponse de l'API, rien en cours ;
 * - `updating` : une modification est partie, le total va changer ;
 * - `unconfirmed` : l'API signale des écarts, ou le panier n'a pas pu être relu ;
 * - `unknown` : panier visiteur, aucun total serveur avant la connexion.
 */
export type TotalState = 'confirmed' | 'updating' | 'unconfirmed' | 'unknown';

/**
 * Écart constaté en relisant le panier avant la commande (US-025), avec le
 * message à montrer au client. `warning` vient de l'API (`Cart.warnings`).
 */
export interface CartDiscrepancy {
  readonly kind: 'price' | 'quantity' | 'removed' | 'warning';
  readonly message: string;
}

/**
 * Issue d'une validation du panier (US-025).
 *
 * - `changed` : le panier a bougé depuis son affichage (prix, quantité, ligne
 *   retirée). Il est à jour à l'écran ; une nouvelle validation le confirme.
 * - `blocked` : l'API signale un problème (stock, produit retiré) que le client
 *   doit corriger avant de pouvoir commander.
 */
export type CartValidation =
  | { readonly status: 'valid' }
  | { readonly status: 'login-required' }
  | { readonly status: 'empty' }
  | { readonly status: 'busy' }
  | { readonly status: 'changed'; readonly discrepancies: readonly CartDiscrepancy[] }
  | { readonly status: 'blocked'; readonly discrepancies: readonly CartDiscrepancy[] }
  | { readonly status: 'error'; readonly message: string };

/** Code d'un refus d'ajout : ceux de l'API, plus le plafond de 99 vérifié côté visiteur. */
export type AddRefusalCode = ApiErrorCode | 'UNKNOWN';

export interface AddRefusal {
  readonly code: AddRefusalCode;
  readonly message: string;
}

export type AddResult =
  | { readonly ok: true; readonly line: CartLine }
  | { readonly ok: false; readonly refusal: AddRefusal };

export type CartStatus = 'idle' | 'loading' | 'ready' | 'error';

/**
 * Panier partagé par toute l'application (US-021).
 *
 * Deux paniers, selon la session (D-017 de brume_back) :
 * - **client connecté** : le panier vit sur l'API (`/cart`). L'état affiché est
 *   toujours la dernière réponse de l'API, qui fait foi pour les prix, les
 *   quantités et le stock ;
 * - **visiteur** : le panier vit dans le `localStorage` (variante + quantité).
 *   À la connexion, il est versé dans le panier du compte par `POST /cart/merge`,
 *   puis effacé.
 *
 * Il ne garde aucune donnée privée après une déconnexion : le panier du compte
 * est oublié dès que la session se ferme.
 */
@Injectable({ providedIn: 'root' })
export class CartStore {
  private readonly auth = inject(AuthService);
  private readonly cartService = inject(CartService);
  private readonly products = inject(ProductsService);
  private readonly storage = inject(BROWSER_STORAGE);

  private readonly accountCart = signal<Cart | null>(null);
  private readonly guestLines = signal<readonly GuestLine[]>(this.readGuestLines());
  private readonly previews = signal<Readonly<Record<string, VariantPreview>>>({});
  private readonly statusSignal = signal<CartStatus>('idle');
  private readonly errorSignal = signal<ApiError | null>(null);
  private readonly drawerOpen = signal(false);
  private readonly lastAdded = signal<string | null>(null);
  /** Quantité demandée par ligne, tant que l'API n'a pas répondu. */
  private readonly pendingQuantities = signal<Readonly<Record<string, number>>>({});
  private readonly removing = signal<ReadonlySet<string>>(new Set());
  private readonly lineErrors = signal<Readonly<Record<string, string>>>({});
  private readonly validationSignal = signal<CartValidation | null>(null);
  /**
   * Numéro de la dernière demande envoyée pour chaque ligne. Une réponse qui
   * ne porte pas ce numéro est périmée : une demande plus récente est partie
   * entre-temps, et c'est sa réponse qui fera foi.
   */
  private readonly lastRequest = new Map<string, number>();

  readonly status = this.statusSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();
  readonly isDrawerOpen = this.drawerOpen.asReadonly();
  /** Variante du dernier ajout réussi, mise en avant dans le tiroir. */
  readonly lastAddedVariantId = this.lastAdded.asReadonly();
  /** Résultat de la dernière validation, effacé à chaque modification du panier. */
  readonly validation = this.validationSignal.asReadonly();

  /** Vrai quand le panier affiché est celui du compte, sur l'API. */
  readonly isAccountCart = computed(() => this.auth.isAuthenticated());

  readonly lines = computed<readonly CartLine[]>(() => {
    const cart = this.accountCart();
    const pending = this.pendingQuantities();
    const removing = this.removing();
    const errors = this.lineErrors();
    const state = (variantId: string): CartLineState =>
      removing.has(variantId)
        ? 'removing'
        : pending[variantId] !== undefined
          ? 'updating'
          : 'stable';

    if (this.isAccountCart()) {
      return (cart?.items ?? []).map((item) => ({
        itemId: item.id,
        variantId: item.variantId,
        productName: item.productName,
        productSlug: item.productSlug,
        variantLabel: item.variantLabel,
        imageUrl: item.imageUrl ?? null,
        quantity: pending[item.variantId] ?? item.quantity,
        unitPriceCents: item.unitPriceCents,
        lineTotalCents: item.lineTotalCents,
        state: state(item.variantId),
        error: errors[item.variantId] ?? null,
      }));
    }

    const previews = this.previews();
    return this.guestLines().map((line) => {
      const preview = previews[line.variantId];
      return {
        itemId: null,
        variantId: line.variantId,
        productName: preview?.productName ?? '',
        productSlug: line.productSlug,
        variantLabel: preview?.variantLabel ?? '',
        imageUrl: preview?.imageUrl ?? null,
        quantity: line.quantity,
        unitPriceCents: preview?.unitPriceCents ?? null,
        lineTotalCents: null,
        state: 'stable' as const,
        error: errors[line.variantId] ?? null,
      };
    });
  });

  /** Nombre d'articles (somme des quantités), affiché dans le menu. */
  readonly itemsCount = computed(() =>
    this.isAccountCart()
      ? (this.accountCart()?.itemsCount ?? 0)
      : this.guestLines().reduce((total, line) => total + line.quantity, 0),
  );

  /** Sous-total de l'API ; `null` pour un visiteur, faute de calcul serveur. */
  readonly itemsTotalCents = computed(() =>
    this.isAccountCart() ? (this.accountCart()?.itemsTotalCents ?? 0) : null,
  );

  /** Écarts signalés par l'API : stock passé sous la quantité, produit retiré… */
  readonly warnings = computed(() =>
    this.isAccountCart() ? (this.accountCart()?.warnings ?? []) : [],
  );

  /** Le total affiché est-il celui que l'API vient de confirmer ? (US-024) */
  readonly totalState = computed<TotalState>(() => {
    if (!this.isAccountCart()) return 'unknown';
    if (
      this.statusSignal() === 'loading' ||
      Object.keys(this.pendingQuantities()).length > 0 ||
      this.removing().size > 0
    ) {
      return 'updating';
    }
    if (this.statusSignal() === 'error' || this.warnings().length > 0) return 'unconfirmed';
    return 'confirmed';
  });

  /** Une modification attend encore sa réponse : on ne valide pas un panier en mouvement. */
  readonly isBusy = computed(() => this.totalState() === 'updating');

  constructor() {
    // Le panier suit la session : chargé (et fusionné) à la connexion, oublié
    // à la déconnexion.
    effect(() => {
      if (this.auth.isAuthenticated()) {
        untracked(() => void this.synchronize());
      } else {
        untracked(() => {
          this.accountCart.set(null);
          this.resetLineStates();
          this.statusSignal.set('idle');
          this.errorSignal.set(null);
          this.hydrateGuestPreviews();
        });
      }
    });
  }

  /**
   * Démarre le panier : demande à l'API qui est connecté (la réponse déclenche
   * le chargement du panier du compte). Sans effet si c'est déjà fait.
   */
  start(): void {
    void this.auth.currentUser();
  }

  /** Recharge le panier du compte, après un échec par exemple. */
  reload(): void {
    if (this.auth.isAuthenticated()) void this.synchronize();
  }

  openDrawer(): void {
    this.drawerOpen.set(true);
  }

  closeDrawer(): void {
    this.drawerOpen.set(false);
  }

  /**
   * Ajoute `quantity` exemplaires d'une variante.
   *
   * Ne lève jamais : un refus revient sous forme de `{ ok: false }` avec un
   * message à afficher tel quel, et l'état du panier n'est pas touché.
   */
  async add(product: CatalogProductDetail, variant: Variant, quantity: number): Promise<AddResult> {
    const user = await this.auth.currentUser();
    const result =
      user === null
        ? this.addAsGuest(product, variant, quantity)
        : await this.addToAccount(variant, quantity);

    if (result.ok) {
      this.lastAdded.set(variant.id);
      this.validationSignal.set(null);
      this.drawerOpen.set(true);
    }
    return result;
  }

  /**
   * Fixe la quantité d'une ligne (US-022).
   *
   * La quantité demandée s'affiche tout de suite ; le total reste marqué « en
   * cours » jusqu'à la réponse. Plusieurs clics rapides envoient plusieurs
   * demandes : seule la réponse de la dernière est appliquée. Sur un refus, le
   * panier est relu pour revenir à la quantité que l'API a réellement acceptée,
   * et le refus s'affiche sur la ligne.
   */
  async setQuantity(variantId: string, quantity: number): Promise<void> {
    this.clearLineError(variantId);
    this.validationSignal.set(null);

    if (
      !Number.isInteger(quantity) ||
      quantity < CART_RULES.quantity.min ||
      quantity > CART_RULES.quantity.max
    ) {
      this.setLineError(variantId, INVALID_QUANTITY);
      return;
    }

    if (!this.isAccountCart()) {
      this.writeGuestLines(
        this.guestLines().map((line) =>
          line.variantId === variantId ? { ...line, quantity } : line,
        ),
      );
      return;
    }

    const item = this.accountCart()?.items.find((candidate) => candidate.variantId === variantId);
    if (item === undefined) return;

    const ticket = (this.lastRequest.get(variantId) ?? 0) + 1;
    this.lastRequest.set(variantId, ticket);
    this.pendingQuantities.update((pending) => ({ ...pending, [variantId]: quantity }));

    try {
      const cart = await firstValueFrom(this.cartService.updateItem(item.id, quantity));
      if (this.lastRequest.get(variantId) !== ticket) return;
      this.dropPending(variantId);
      this.accountCart.set(cart);
    } catch (error) {
      if (this.lastRequest.get(variantId) !== ticket) return;
      this.dropPending(variantId);
      const apiError = toApiError(error);
      // Sur une ligne disparue, il n'y a rien à expliquer : la relecture la retire.
      if (apiError.code !== 'NOT_FOUND') {
        this.setLineError(variantId, refusalFrom(apiError, quantity).message);
      }
      await this.refresh();
    }
  }

  /**
   * Retire une ligne (US-023).
   *
   * Une ligne déjà retirée (double clic, autre onglet) répond 404 : ce n'est pas
   * une erreur pour le client, le panier est simplement relu. Tout autre échec
   * laisse la ligne en place, avec un message.
   */
  async remove(variantId: string): Promise<void> {
    this.clearLineError(variantId);
    this.validationSignal.set(null);

    if (!this.isAccountCart()) {
      this.writeGuestLines(this.guestLines().filter((line) => line.variantId !== variantId));
      return;
    }

    const item = this.accountCart()?.items.find((candidate) => candidate.variantId === variantId);
    if (item === undefined || this.removing().has(variantId)) return;

    // Une modification de quantité encore en vol devient sans objet.
    this.lastRequest.set(variantId, (this.lastRequest.get(variantId) ?? 0) + 1);
    this.dropPending(variantId);
    this.removing.update((removing) => new Set(removing).add(variantId));

    try {
      this.accountCart.set(await firstValueFrom(this.cartService.removeItem(item.id)));
    } catch (error) {
      if (toApiError(error).code === 'NOT_FOUND') {
        await this.refresh();
      } else {
        this.setLineError(variantId, 'La suppression n’a pas abouti. Merci de réessayer.');
      }
    } finally {
      this.removing.update((removing) => {
        const next = new Set(removing);
        next.delete(variantId);
        return next;
      });
    }
  }

  /**
   * Relit le panier avant d'entrer dans la commande (US-025).
   *
   * Les prix et le stock sont recalculés par l'API à chaque lecture : tout ce
   * qui a bougé depuis l'affichage est rapporté, et le panier affiché devient
   * celui de l'API. Le client doit alors confirmer de nouveau, en connaissance
   * de cause ; s'il reste un problème de stock, il doit d'abord le corriger.
   */
  async validate(): Promise<CartValidation> {
    const result = await this.runValidation();
    this.validationSignal.set(result);
    return result;
  }

  private async runValidation(): Promise<CartValidation> {
    // D-013 : un compte est obligatoire pour commander.
    if ((await this.auth.currentUser()) === null) return { status: 'login-required' };
    if (this.isBusy()) return { status: 'busy' };

    const shown = this.accountCart();
    let fresh: Cart;
    try {
      fresh = await firstValueFrom(this.cartService.get());
    } catch (error) {
      return { status: 'error', message: toApiError(error).message };
    }
    this.accountCart.set(fresh);
    this.statusSignal.set('ready');
    this.errorSignal.set(null);

    if (fresh.items.length === 0) return { status: 'empty' };

    const blocking: CartDiscrepancy[] = fresh.warnings.map((warning) => ({
      kind: 'warning',
      message: warning.message ?? 'Une ligne de ton panier a changé.',
    }));
    if (blocking.length > 0) return { status: 'blocked', discrepancies: blocking };

    const changes = shown === null ? [] : discrepanciesBetween(shown, fresh);
    return changes.length > 0 ? { status: 'changed', discrepancies: changes } : { status: 'valid' };
  }

  private async addToAccount(variant: Variant, quantity: number): Promise<AddResult> {
    try {
      const cart = await firstValueFrom(
        this.cartService.addItem({ variantId: variant.id, quantity }),
      );
      this.accountCart.set(cart);
      this.statusSignal.set('ready');
      const line = this.lines().find((candidate) => candidate.variantId === variant.id);
      return line === undefined
        ? { ok: false, refusal: { code: 'UNKNOWN', message: GENERIC_REFUSAL } }
        : { ok: true, line };
    } catch (error) {
      return { ok: false, refusal: refusalFrom(toApiError(error), quantity) };
    }
  }

  /**
   * Côté visiteur, le stock exact n'est pas connu : seule une variante épuisée
   * et le plafond de 99 sont refusés ici. L'API tranchera à la fusion, en
   * plafonnant au stock et en le signalant dans `warnings`.
   */
  private addAsGuest(product: CatalogProductDetail, variant: Variant, quantity: number): AddResult {
    if (variant.availability === 'OUT_OF_STOCK') {
      return { ok: false, refusal: { code: 'OUT_OF_STOCK', message: SOLD_OUT } };
    }

    const existing = this.guestLines().find((line) => line.variantId === variant.id);
    const total = (existing?.quantity ?? 0) + quantity;
    if (!Number.isInteger(quantity) || quantity < CART_RULES.quantity.min) {
      return { ok: false, refusal: { code: 'VALIDATION_ERROR', message: INVALID_QUANTITY } };
    }
    if (total > CART_RULES.quantity.max) {
      return {
        ok: false,
        refusal: { code: 'VALIDATION_ERROR', message: maxReached(existing?.quantity ?? 0) },
      };
    }

    const lines =
      existing === undefined
        ? [...this.guestLines(), { variantId: variant.id, quantity, productSlug: product.slug }]
        : this.guestLines().map((line) =>
            line.variantId === variant.id ? { ...line, quantity: total } : line,
          );
    this.writeGuestLines(lines);
    this.rememberPreviews(product);

    const line = this.lines().find((candidate) => candidate.variantId === variant.id);
    return line === undefined
      ? { ok: false, refusal: { code: 'UNKNOWN', message: GENERIC_REFUSAL } }
      : { ok: true, line };
  }

  /** Relit le panier du compte sans repasser l'écran en chargement. */
  private async refresh(): Promise<void> {
    try {
      this.accountCart.set(await firstValueFrom(this.cartService.get()));
      this.statusSignal.set('ready');
    } catch (error) {
      this.errorSignal.set(toApiError(error));
      this.statusSignal.set('error');
    }
  }

  private dropPending(variantId: string): void {
    this.pendingQuantities.update(({ [variantId]: _dropped, ...rest }) => rest);
  }

  private setLineError(variantId: string, message: string): void {
    this.lineErrors.update((errors) => ({ ...errors, [variantId]: message }));
  }

  private clearLineError(variantId: string): void {
    this.lineErrors.update(({ [variantId]: _cleared, ...rest }) => rest);
  }

  private resetLineStates(): void {
    this.lastRequest.clear();
    this.pendingQuantities.set({});
    this.removing.set(new Set());
    this.lineErrors.set({});
    this.validationSignal.set(null);
  }

  /** Charge le panier du compte, en y versant d'abord le panier visiteur s'il y en a un. */
  private async synchronize(): Promise<void> {
    this.statusSignal.set('loading');
    this.errorSignal.set(null);

    const pending: AddCartItemRequest[] = this.guestLines().map(({ variantId, quantity }) => ({
      variantId,
      quantity,
    }));

    try {
      const cart =
        pending.length > 0
          ? await firstValueFrom(this.cartService.merge(pending))
          : await firstValueFrom(this.cartService.get());
      // Effacé seulement une fois la fusion confirmée : sur un échec, le
      // visiteur ne perd rien et la fusion sera retentée.
      if (pending.length > 0) this.writeGuestLines([]);
      this.accountCart.set(cart);
      this.statusSignal.set('ready');
    } catch (error) {
      this.errorSignal.set(toApiError(error));
      this.statusSignal.set('error');
    }
  }

  /** Redemande au catalogue de quoi afficher les lignes visiteur. */
  private hydrateGuestPreviews(): void {
    const known = this.previews();
    const slugs = new Set(
      this.guestLines()
        .filter((line) => known[line.variantId] === undefined)
        .map((line) => line.productSlug),
    );
    for (const slug of slugs) {
      this.products.getBySlug(slug).subscribe({
        next: (product) => this.rememberPreviews(product),
        // Une ligne sans aperçu reste comptée ; l'API tranchera à la fusion.
        error: () => undefined,
      });
    }
  }

  private rememberPreviews(product: CatalogProductDetail): void {
    const entries = Object.fromEntries(
      product.variants.map((variant) => [
        variant.id,
        {
          productName: product.name,
          productSlug: product.slug,
          variantLabel: variant.label,
          imageUrl: product.image?.url ?? null,
          unitPriceCents: variant.priceCents,
        } satisfies VariantPreview,
      ]),
    );
    this.previews.update((previews) => ({ ...previews, ...entries }));
  }

  private readGuestLines(): GuestLine[] {
    try {
      const raw = this.storage.getItem(GUEST_CART_KEY);
      const value: unknown = raw === null ? [] : JSON.parse(raw);
      return Array.isArray(value) ? value.filter(isGuestLine) : [];
    } catch {
      return [];
    }
  }

  private writeGuestLines(lines: readonly GuestLine[]): void {
    this.guestLines.set(lines);
    try {
      if (lines.length === 0) {
        this.storage.removeItem(GUEST_CART_KEY);
      } else {
        this.storage.setItem(GUEST_CART_KEY, JSON.stringify(lines));
      }
    } catch {
      // Navigation privée ou quota atteint : le panier vit le temps de la page.
    }
  }
}

/** Ce qui a changé entre le panier affiché et celui que l'API vient de renvoyer. */
function discrepanciesBetween(shown: Cart, fresh: Cart): CartDiscrepancy[] {
  const changes: CartDiscrepancy[] = [];
  for (const before of shown.items) {
    const after = fresh.items.find((item) => item.variantId === before.variantId);
    const nom = `${before.productName} (${before.variantLabel})`;
    if (after === undefined) {
      changes.push({ kind: 'removed', message: `${nom} n’est plus dans ton panier.` });
      continue;
    }
    if (after.unitPriceCents !== before.unitPriceCents) {
      changes.push({
        kind: 'price',
        message: `Le prix de ${nom} est passé de ${formatCents(before.unitPriceCents)} à ${formatCents(after.unitPriceCents)}.`,
      });
    }
    if (after.quantity !== before.quantity) {
      changes.push({
        kind: 'quantity',
        message: `La quantité de ${nom} est passée de ${before.quantity} à ${after.quantity}.`,
      });
    }
  }
  return changes;
}

function isGuestLine(value: unknown): value is GuestLine {
  if (value === null || typeof value !== 'object') return false;
  const line = value as Record<string, unknown>;
  return (
    typeof line['variantId'] === 'string' &&
    typeof line['productSlug'] === 'string' &&
    Number.isInteger(line['quantity']) &&
    (line['quantity'] as number) >= CART_RULES.quantity.min &&
    (line['quantity'] as number) <= CART_RULES.quantity.max
  );
}

const GENERIC_REFUSAL = 'L’ajout n’a pas abouti. Merci de réessayer.';
const SOLD_OUT = 'Ce format est épuisé pour le moment.';
const INVALID_QUANTITY = `Choisis une quantité entre ${CART_RULES.quantity.min} et ${CART_RULES.quantity.max}.`;

function maxReached(alreadyInCart: number): string {
  return alreadyInCart > 0
    ? `${CART_RULES.quantity.max} exemplaires au plus par format : tu en as déjà ${alreadyInCart} dans ton panier.`
    : `${CART_RULES.quantity.max} exemplaires au plus par format.`;
}

interface StockDetail {
  readonly requested: number;
  readonly available: number;
}

function stockDetail(error: ApiError): StockDetail | null {
  const first: unknown = Array.isArray(error.details) ? error.details[0] : undefined;
  if (first === null || typeof first !== 'object') return null;
  const detail = first as Record<string, unknown>;
  return typeof detail['requested'] === 'number' && typeof detail['available'] === 'number'
    ? { requested: detail['requested'], available: detail['available'] }
    : null;
}

/**
 * Traduit un refus de l'API en message, d'après son `code` (jamais d'après
 * `message`, qui peut changer).
 */
export function refusalFrom(error: ApiError, quantity: number): AddRefusal {
  const code = error.code;
  switch (code) {
    case 'OUT_OF_STOCK': {
      const stock = stockDetail(error);
      if (stock === null) return { code, message: 'Stock insuffisant pour cette quantité.' };
      if (stock.available === 0) return { code, message: SOLD_OUT };
      // `requested` est la quantité cumulée : ce qui était déjà au panier + l'ajout.
      const inCart = Math.max(0, stock.requested - quantity);
      const left =
        stock.available === 1
          ? 'Il ne reste qu’un exemplaire'
          : `Il ne reste que ${stock.available} exemplaires`;
      return {
        code,
        message:
          inCart > 0
            ? `${left} de ce format, et tu en as déjà ${inCart} dans ton panier.`
            : `${left} de ce format.`,
      };
    }
    case 'PRODUCT_UNAVAILABLE':
      return { code, message: 'Ce format n’est plus disponible.' };
    case 'NOT_FOUND':
      return {
        code,
        message: 'Ce format n’existe plus. Recharge la page pour voir les formats à jour.',
      };
    case 'VALIDATION_ERROR':
      return {
        code,
        message: error.fieldErrors['quantity']?.some((rule) => rule.includes('greater'))
          ? maxReached(0)
          : INVALID_QUANTITY,
      };
    case 'UNAUTHENTICATED':
      return { code, message: 'Ta session a expiré. Reconnecte-toi pour ajouter au panier.' };
    default:
      return { code, message: error.message || GENERIC_REFUSAL };
  }
}

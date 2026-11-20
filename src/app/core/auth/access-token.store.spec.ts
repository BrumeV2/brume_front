import { afterEach, describe, expect, it, vi } from 'vitest';
import { AccessTokenStore } from './access-token.store';

describe('AccessTokenStore', () => {
  afterEach(() => vi.restoreAllMocks());
  it('garde un jeton opaque en mémoire et le retire à expiration', () => {
    let now = 1000;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    const store = new AccessTokenStore();
    const invalidation = vi.fn();
    store.invalidated.subscribe(invalidation);
    store.set({ accessToken: 'A'.repeat(43), tokenType: 'Bearer', expiresIn: 2 });
    expect(store.get()).toBe('A'.repeat(43));
    now = 3000;
    expect(store.get()).toBeNull();
    expect(invalidation).toHaveBeenCalledTimes(1);
    expect(new AccessTokenStore().get()).toBeNull();
  });
  it('refuse une réponse de jeton mal formée', () => {
    const store = new AccessTokenStore();
    expect(() => store.set({ accessToken: '', tokenType: 'Bearer', expiresIn: 1 })).toThrow();
    expect(() =>
      store.set({ accessToken: 'A'.repeat(43), tokenType: 'Bearer', expiresIn: 0 }),
    ).toThrow();
  });
});

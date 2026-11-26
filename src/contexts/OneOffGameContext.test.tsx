import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';

const auth = vi.hoisted(() => ({
  value: { user: { id: 'u1' }, homegame: { currency: 'A$' } } as {
    user: { id: string } | null;
    homegame: { currency: string } | null;
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuthContext: () => auth.value,
}));

import { OneOffGameProvider, useOneOffGame } from './OneOffGameContext';
import { localDate } from '@/lib/oneOff/localStore';

const wrapper = ({ children }: { children: ReactNode }) => (
  <OneOffGameProvider>{children}</OneOffGameProvider>
);
const mount = () => renderHook(() => useOneOffGame(), { wrapper });

// Node's own (unconfigured) localStorage shadows jsdom's, so each test gets
// a fresh in-memory store, as in src/hooks/useAuth.test.ts.
let store: Map<string, string>;
beforeEach(() => {
  auth.value = { user: { id: 'u1' }, homegame: { currency: 'A$' } };
  store = new Map();
  vi.stubGlobal('localStorage', {
    getItem: vi.fn((k: string) => store.get(k) ?? null),
    setItem: vi.fn((k: string, v: string) => void store.set(k, v)),
    removeItem: vi.fn((k: string) => void store.delete(k)),
  });
});

afterEach(() => vi.unstubAllGlobals());

describe('OneOffGameProvider', () => {
  it('start persists under oneoff:v1:u1, and a fresh mount restores it', () => {
    const first = mount();
    expect(first.result.current.game).toBeNull();

    let res: { error: string | null } = { error: 'unset' };
    act(() => {
      res = first.result.current.start({ mode: 'live', names: ['Dan', 'Sam'], defaultBuyIn: 50 });
    });
    expect(res.error).toBeNull();
    const game = first.result.current.game!;
    expect(JSON.parse(store.get('oneoff:v1:u1')!)).toEqual(game);
    first.unmount();

    const second = mount();
    expect(second.result.current.game).toEqual(game);
  });

  it('start builds live players at the default buy-in with unique ids', () => {
    const { result } = mount();
    act(() => {
      result.current.start({ mode: 'live', names: [' Dan ', 'Sam', 'Lee'], defaultBuyIn: 50 });
    });
    const game = result.current.game!;
    expect(game.mode).toBe('live');
    expect(game.default_buy_in).toBe(50);
    expect(game.players.map(p => p.name)).toEqual(['Dan', 'Sam', 'Lee']);
    expect(game.players.every(p => p.buy_in === 50 && p.cash_out === null)).toBe(true);
    expect(new Set(game.players.map(p => p.id)).size).toBe(3);
    expect(game.payments).toEqual([]);
    expect(result.current.seatedCount).toBe(3);
    expect(result.current.totalBuyIn).toBe(150);
    expect(result.current.totalPot).toBe(150);
  });

  it('start in totals mode begins every buy-in at 0', () => {
    const { result } = mount();
    act(() => {
      result.current.start({ mode: 'totals', names: ['Dan', 'Sam'], defaultBuyIn: 50 });
    });
    expect(result.current.game!.players.map(p => [p.buy_in, p.cash_out])).toEqual([
      [0, null],
      [0, null],
    ]);
  });

  it("start defaults the currency to the homegame's and played_on to today", () => {
    const { result } = mount();
    act(() => {
      result.current.start({ mode: 'live', names: ['Dan', 'Sam'], defaultBuyIn: 50 });
    });
    expect(result.current.game!.currency).toBe('A$');
    expect(result.current.game!.played_on).toBe(localDate());
    expect(result.current.game!.label).toBe('');
  });

  it('start uses a given label and currency', () => {
    const { result } = mount();
    act(() => {
      result.current.start({
        mode: 'live',
        names: ['Dan', 'Sam'],
        defaultBuyIn: 50,
        label: 'Friday',
        currency: '€',
      });
    });
    expect(result.current.game).toMatchObject({ label: 'Friday', currency: '€' });
  });

  it('start falls back to $ with no homegame', () => {
    auth.value = { user: { id: 'u1' }, homegame: null };
    const { result } = mount();
    act(() => {
      result.current.start({ mode: 'live', names: ['Dan', 'Sam'], defaultBuyIn: 50 });
    });
    expect(result.current.game!.currency).toBe('$');
  });

  it('start needs at least two players', () => {
    const { result } = mount();
    let res: { error: string | null } = { error: null };
    act(() => {
      res = result.current.start({ mode: 'live', names: ['Dan'], defaultBuyIn: 50 });
    });
    expect(res.error).toBe('Add at least two players');
    expect(result.current.game).toBeNull();
    expect(store.size).toBe(0);
  });

  it('start rejects blank or duplicate names', () => {
    const { result } = mount();
    let res: { error: string | null } = { error: null };
    act(() => {
      res = result.current.start({ mode: 'live', names: ['Dan', 'dan'], defaultBuyIn: 50 });
    });
    expect(res.error).toBe('Two players are called dan');
    expect(result.current.game).toBeNull();
  });

  it('dispatch applies an action, persists it and updates the totals', () => {
    const { result } = mount();
    act(() => {
      result.current.start({ mode: 'live', names: ['Dan', 'Sam'], defaultBuyIn: 50 });
    });
    const [dan] = result.current.game!.players;
    let res: { error: string | null } = { error: 'unset' };
    act(() => {
      res = result.current.dispatch({ type: 'cashOut', id: dan.id, amount: 30 });
    });
    expect(res.error).toBeNull();
    expect(result.current.seatedCount).toBe(1);
    expect(result.current.totalBuyIn).toBe(100);
    expect(result.current.totalPot).toBe(70);
    expect(JSON.parse(store.get('oneoff:v1:u1')!).players[0].cash_out).toBe(30);
  });

  it('dispatch returns the reducer error and leaves the game alone', () => {
    const { result } = mount();
    act(() => {
      result.current.start({ mode: 'live', names: ['Dan', 'Sam'], defaultBuyIn: 50 });
    });
    const before = result.current.game;
    const [dan] = before!.players;
    let res: { error: string | null } = { error: null };
    act(() => {
      res = result.current.dispatch({
        type: 'addPayment',
        payment: { from_id: dan.id, to_id: dan.id, amount: 5 },
      });
    });
    expect(res.error).toBe('Pick two different players');
    expect(result.current.game).toBe(before);
  });

  it('dispatch with no game in progress returns an error', () => {
    const { result } = mount();
    let res: { error: string | null } = { error: null };
    act(() => {
      res = result.current.dispatch({ type: 'rejoin', id: 'x' });
    });
    expect(res.error).toBe('No game in progress');
  });

  it('storage unavailable keeps the game in memory', () => {
    vi.mocked(localStorage.setItem).mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    const { result } = mount();
    expect(result.current.storageOk).toBe(true);
    act(() => {
      result.current.start({ mode: 'live', names: ['Dan', 'Sam'], defaultBuyIn: 50 });
    });
    expect(result.current.game).not.toBeNull();
    expect(result.current.storageOk).toBe(false);

    const [dan] = result.current.game!.players;
    act(() => {
      result.current.dispatch({ type: 'addBuyIn', id: dan.id, amount: 20 });
    });
    expect(result.current.game!.players[0].buy_in).toBe(70);
    expect(result.current.storageOk).toBe(false);
  });

  it('discard clears both the state and the key', () => {
    const { result } = mount();
    act(() => {
      result.current.start({ mode: 'live', names: ['Dan', 'Sam'], defaultBuyIn: 50 });
    });
    expect(store.has('oneoff:v1:u1')).toBe(true);
    act(() => result.current.discard());
    expect(result.current.game).toBeNull();
    expect(store.has('oneoff:v1:u1')).toBe(false);
  });

  it('reloads when the signed-in user changes', () => {
    const { result, rerender } = mount();
    act(() => {
      result.current.start({ mode: 'live', names: ['Dan', 'Sam'], defaultBuyIn: 50 });
    });
    const u1Game = result.current.game;

    auth.value = { user: { id: 'u2' }, homegame: { currency: 'A$' } };
    rerender();
    expect(result.current.game).toBeNull();

    auth.value = { user: null, homegame: null };
    rerender();
    expect(result.current.game).toBeNull();

    auth.value = { user: { id: 'u1' }, homegame: { currency: 'A$' } };
    rerender();
    expect(result.current.game).toEqual(u1Game);
  });

  it("never renders one user's game for another, even for a single render", () => {
    const seen: { userId: string | undefined; gameId: string | null }[] = [];
    const { result, rerender } = renderHook(
      () => {
        const value = useOneOffGame();
        seen.push({ userId: auth.value.user?.id, gameId: value.game?.started_at ?? null });
        return value;
      },
      { wrapper }
    );
    act(() => {
      result.current.start({ mode: 'live', names: ['Dan', 'Sam'], defaultBuyIn: 50 });
    });
    const u1Started = result.current.game!.started_at;

    seen.length = 0;
    auth.value = { user: { id: 'u2' }, homegame: { currency: 'A$' } };
    rerender();
    expect(seen.length).toBeGreaterThan(0);
    expect(seen.filter(r => r.userId === 'u2' && r.gameId === u1Started)).toEqual([]);
  });

  it("a dispatch right after a user switch never writes the old user's game under the new key", () => {
    const { result, rerender } = mount();
    act(() => {
      result.current.start({ mode: 'live', names: ['Dan', 'Sam'], defaultBuyIn: 50 });
    });
    const staleDispatch = result.current.dispatch;
    const [dan] = result.current.game!.players;

    auth.value = { user: { id: 'u2' }, homegame: { currency: 'A$' } };
    rerender();
    let fresh: { error: string | null } = { error: null };
    let stale: { error: string | null } = { error: null };
    act(() => {
      fresh = result.current.dispatch({ type: 'addBuyIn', id: dan.id, amount: 10 });
      stale = staleDispatch({ type: 'addBuyIn', id: dan.id, amount: 10 });
    });
    expect(fresh.error).toBe('No game in progress');
    expect(stale.error).toBe('No game in progress');
    expect(store.has('oneoff:v1:u2')).toBe(false);
    expect(JSON.parse(store.get('oneoff:v1:u1')!).players[0].buy_in).toBe(50);
  });

  it('treats a stored game without a players list as no game', () => {
    store.set('oneoff:v1:u1', JSON.stringify({ version: 1, mode: 'live' }));
    const { result } = mount();
    expect(result.current.game).toBeNull();
    expect(result.current.seatedCount).toBe(0);
  });

  describe('another tab', () => {
    const otherGame = (buyIn: number) => ({
      version: 1,
      mode: 'live',
      label: 'Other tab',
      played_on: '2026-11-26',
      currency: 'A$',
      notes: '',
      default_buy_in: 50,
      started_at: '2026-11-26T08:00:00.000Z',
      players: [
        { id: 'p1', name: 'Dan', buy_in: buyIn, cash_out: null },
        { id: 'p2', name: 'Sam', buy_in: 50, cash_out: null },
      ],
      payments: [],
    });
    const fire = (key: string, newValue: string | null) =>
      act(() => {
        window.dispatchEvent(new StorageEvent('storage', { key, newValue }));
      });

    it("picks up a game another tab wrote under this user's key", () => {
      const { result } = mount();
      act(() => {
        result.current.start({ mode: 'live', names: ['Dan', 'Sam'], defaultBuyIn: 50 });
      });
      const newer = otherGame(150);
      fire('oneoff:v1:u1', JSON.stringify(newer));
      expect(result.current.game).toEqual(newer);
      expect(result.current.totalBuyIn).toBe(200);
    });

    it('clears the game when another tab removes it', () => {
      const { result } = mount();
      act(() => {
        result.current.start({ mode: 'live', names: ['Dan', 'Sam'], defaultBuyIn: 50 });
      });
      fire('oneoff:v1:u1', null);
      expect(result.current.game).toBeNull();
    });

    it('treats an invalid value from another tab as no game', () => {
      const { result } = mount();
      act(() => {
        result.current.start({ mode: 'live', names: ['Dan', 'Sam'], defaultBuyIn: 50 });
      });
      fire('oneoff:v1:u1', JSON.stringify({ version: 1, mode: 'live' }));
      expect(result.current.game).toBeNull();
    });

    it('clears the game when another tab clears all storage', () => {
      const { result } = mount();
      act(() => {
        result.current.start({ mode: 'live', names: ['Dan', 'Sam'], defaultBuyIn: 50 });
      });
      act(() => {
        window.dispatchEvent(new StorageEvent('storage', { key: null }));
      });
      expect(result.current.game).toBeNull();
    });

    it("ignores another user's key", () => {
      const { result } = mount();
      act(() => {
        result.current.start({ mode: 'live', names: ['Dan', 'Sam'], defaultBuyIn: 50 });
      });
      const mine = result.current.game;
      fire('oneoff:v1:u2', JSON.stringify(otherGame(150)));
      fire('oneoff:v1:u2', null);
      expect(result.current.game).toEqual(mine);
    });

    it('stops listening after unmount', () => {
      const remove = vi.spyOn(window, 'removeEventListener');
      const { unmount } = mount();
      unmount();
      expect(remove).toHaveBeenCalledWith('storage', expect.any(Function));
      remove.mockRestore();
    });
  });

  it('useOneOffGame outside the provider throws', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useOneOffGame())).toThrow(
      'useOneOffGame must be used within a OneOffGameProvider'
    );
    spy.mockRestore();
  });
});

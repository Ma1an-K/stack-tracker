import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { storageKey, loadGame, saveGame, clearGame, validateNames, localDate } from './localStore';
import type { OneOffGame } from './types';

const game: OneOffGame = {
  version: 1,
  mode: 'live',
  label: 'Friday',
  played_on: '2026-11-26',
  currency: 'AUD',
  notes: '',
  default_buy_in: 50,
  started_at: '2026-11-26T09:00:00.000Z',
  players: [
    { id: 'a', name: 'Dan', buy_in: 50, cash_out: null },
    { id: 'b', name: 'Sam', buy_in: 50, cash_out: null },
  ],
  payments: [],
};

// Node's own (unconfigured) localStorage shadows jsdom's, so each test gets
// a fresh in-memory store, as in src/hooks/useAuth.test.ts.
let store: Map<string, string>;
beforeEach(() => {
  store = new Map();
  vi.stubGlobal('localStorage', {
    getItem: vi.fn((k: string) => store.get(k) ?? null),
    setItem: vi.fn((k: string, v: string) => void store.set(k, v)),
    removeItem: vi.fn((k: string) => void store.delete(k)),
  });
});

afterEach(() => vi.unstubAllGlobals());

describe('device storage', () => {
  it('uses a per-user versioned key', () => {
    expect(storageKey('u1')).toBe('oneoff:v1:u1');
  });

  it('saves and restores a game', () => {
    expect(saveGame('u1', game)).toBe(true);
    expect(loadGame('u1')).toEqual(game);
  });

  it('clearGame removes it', () => {
    saveGame('u1', game);
    clearGame('u1');
    expect(loadGame('u1')).toBeNull();
    expect(localStorage.getItem(storageKey('u1'))).toBeNull();
  });

  it("another user's game is not visible", () => {
    saveGame('u1', game);
    expect(loadGame('u2')).toBeNull();
  });

  it('corrupt JSON or wrong version returns null', () => {
    localStorage.setItem(storageKey('u1'), '{not json');
    expect(loadGame('u1')).toBeNull();

    localStorage.setItem(storageKey('u1'), JSON.stringify({ ...game, version: 2 }));
    expect(loadGame('u1')).toBeNull();

    localStorage.setItem(storageKey('u1'), 'null');
    expect(loadGame('u1')).toBeNull();
  });

  it('storage that throws', () => {
    vi.mocked(localStorage.setItem).mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    vi.mocked(localStorage.getItem).mockImplementation(() => {
      throw new Error('SecurityError');
    });
    vi.mocked(localStorage.removeItem).mockImplementation(() => {
      throw new Error('SecurityError');
    });

    expect(saveGame('u1', game)).toBe(false);
    expect(loadGame('u1')).toBeNull();
    expect(() => clearGame('u1')).not.toThrow();
  });
});

describe('validateNames', () => {
  it('flags a duplicate ignoring case and surrounding spaces', () => {
    expect(validateNames(['Dan', 'dan '])).toBe('Two players are called dan');
  });

  it('flags a blank name', () => {
    expect(validateNames(['Dan', ''])).toBe('Every player needs a name');
    expect(validateNames(['Dan', '   '])).toBe('Every player needs a name');
  });

  it('accepts distinct names', () => {
    expect(validateNames(['Dan', 'Sam'])).toBeNull();
  });
});

describe('localDate', () => {
  it('localDate uses local time', () => {
    expect(localDate(new Date(2026, 10, 26, 23, 30))).toBe('2026-11-26');
    expect(localDate(new Date(2026, 0, 5, 0, 15))).toBe('2026-01-05');
  });
});

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { welcomeTarget, hasSeenWelcome, markWelcomeSeen } from './welcomeTarget';

// Node's own (unconfigured) localStorage shadows jsdom's, so each test gets
// a fresh in-memory store, as in src/hooks/useAuth.test.ts.
let store: Map<string, string>;
function stubStorage() {
  store = new Map();
  vi.stubGlobal('localStorage', {
    getItem: vi.fn((k: string) => store.get(k) ?? null),
    setItem: vi.fn((k: string, v: string) => void store.set(k, v)),
    removeItem: vi.fn((k: string) => void store.delete(k)),
  });
}
afterEach(() => vi.unstubAllGlobals());

describe('welcomeTarget', () => {
  it('sends a brand-new account to the choice screen', () => {
    expect(welcomeTarget({ homegameCount: 0, pendingCode: null, hasSeenWelcome: false })).toBe('/welcome');
  });

  it('sends someone with an invite straight to the join step', () => {
    expect(welcomeTarget({ homegameCount: 0, pendingCode: 'K7Q4MX', hasSeenWelcome: false })).toBe('/welcome/join');
  });

  it('lets the invite win even after the choice screen was seen', () => {
    expect(welcomeTarget({ homegameCount: 0, pendingCode: 'K7Q4MX', hasSeenWelcome: true })).toBe('/welcome/join');
  });

  it('sends a host who quit after creating the game home', () => {
    expect(welcomeTarget({ homegameCount: 1, pendingCode: null, hasSeenWelcome: false })).toBe('/');
  });

  it('sends someone who already chose a quick game home', () => {
    expect(welcomeTarget({ homegameCount: 0, pendingCode: null, hasSeenWelcome: true })).toBe('/');
  });
});

describe('welcome_seen flag', () => {
  beforeEach(stubStorage);

  it('is unset until a choice is made, then reads as seen', () => {
    expect(hasSeenWelcome()).toBe(false);
    markWelcomeSeen();
    expect(store.get('welcome_seen')).toBe('1');
    expect(hasSeenWelcome()).toBe(true);
  });
});

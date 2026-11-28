import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { nudgeState, readNudge, writeNudge, SNOOZE_MS } from './installNudge';

function memoryStorage(): Storage {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, String(v)),
    removeItem: (k) => void m.delete(k),
    clear: () => m.clear(),
    key: (i) => [...m.keys()][i] ?? null,
    get length() {
      return m.size;
    },
  };
}


const NOW = 1_800_000_000_000;

describe('nudgeState', () => {
  it('allows the sheet and shows the banner with nothing stored', () => {
    expect(nudgeState({}, NOW)).toEqual({ sheetAllowed: true, bannerVisible: true });
  });

  it('blocks the sheet while snoozed', () => {
    expect(nudgeState({ snoozedUntil: NOW + 1 }, NOW).sheetAllowed).toBe(false);
  });

  it('allows the sheet again once the snooze has passed', () => {
    expect(nudgeState({ snoozedUntil: NOW - 1 }, NOW).sheetAllowed).toBe(true);
  });

  it('hides the banner for good after two dismissals', () => {
    expect(nudgeState({ bannerDismissals: 1 }, NOW).bannerVisible).toBe(true);
    expect(nudgeState({ bannerDismissals: 2 }, NOW).bannerVisible).toBe(false);
  });

  it('keeps the banner quiet during a snooze too', () => {
    expect(nudgeState({ snoozedUntil: NOW + SNOOZE_MS }, NOW).bannerVisible).toBe(false);
  });

  it('snoozes for seven days', () => {
    expect(SNOOZE_MS).toBe(7 * 24 * 60 * 60 * 1000);
  });
});

describe('readNudge / writeNudge', () => {
  beforeEach(() => vi.stubGlobal('localStorage', memoryStorage()));
  afterEach(() => vi.unstubAllGlobals());

  it('merges patches into install_nudge as JSON', () => {
    writeNudge({ bannerDismissals: 1 });
    writeNudge({ snoozedUntil: NOW });
    expect(JSON.parse(localStorage.getItem('install_nudge')!)).toEqual({ bannerDismissals: 1, snoozedUntil: NOW });
    expect(readNudge()).toEqual({ bannerDismissals: 1, snoozedUntil: NOW });
  });

  it('reads garbage as an empty store', () => {
    localStorage.setItem('install_nudge', '{not json');
    expect(readNudge()).toEqual({});
  });
});

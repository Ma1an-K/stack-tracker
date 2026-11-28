import { describe, it, expect } from 'vitest';
import { TOUR_CARDS, TOUR_RELEASE, isTourEligible, tourRole } from './tour';

describe('tourRole', () => {
  it('maps homegame roles to tour roles', () => {
    expect(tourRole({ role: 'owner' })).toBe('host');
    expect(tourRole({ role: 'admin' })).toBe('host');
    expect(tourRole({ role: 'member' })).toBe('member');
    expect(tourRole(null)).toBe('solo');
  });
});

describe('TOUR_CARDS', () => {
  it('gives hosts four cards ending with running the homegame', () => {
    expect(TOUR_CARDS.host.map((c) => c.title)).toEqual([
      'Log every game',
      'Settle up in seconds',
      'Standings and badges',
      'Run your homegame',
    ]);
  });

  it('gives members their own stats card mentioning the sidepot calculator', () => {
    expect(TOUR_CARDS.member).toHaveLength(4);
    expect(TOUR_CARDS.member[3].title).toBe('Your own stats');
    expect(TOUR_CARDS.member[3].body).toContain('sidepot calculator');
  });

  it('gives solo players three cards ending with the homegame pitch', () => {
    expect(TOUR_CARDS.solo).toHaveLength(3);
    expect(TOUR_CARDS.solo[2].title).toBe('Same crew every week?');
  });

  it('gives every card a unique id within its role', () => {
    for (const cards of Object.values(TOUR_CARDS)) {
      const ids = cards.map((c) => c.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});

describe('isTourEligible', () => {
  const fresh = { created_at: TOUR_RELEASE, seen_tips: [] as string[] };

  it('is false without a profile', () => {
    expect(isTourEligible(null)).toBe(false);
  });

  it('is false when seen_tips is not stored yet', () => {
    expect(isTourEligible({ created_at: TOUR_RELEASE })).toBe(false);
  });

  it('is an exact instant with a timezone offset, not a bare date', () => {
    expect(TOUR_RELEASE).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?[+-]\d{2}:\d{2}$/);
  });

  it('is false for an account created one second before the release instant', () => {
    const before = new Date(Date.parse(TOUR_RELEASE) - 1000).toISOString();
    expect(isTourEligible({ ...fresh, created_at: before })).toBe(false);
  });

  it('reads the instant with its offset (AEDT midnight), not UTC midnight', () => {
    expect(isTourEligible({ ...fresh, created_at: '2026-11-27T13:00:00Z' })).toBe(true);
    expect(isTourEligible({ ...fresh, created_at: '2026-11-27T12:59:59Z' })).toBe(false);
  });

  it('is true for an account created at the exact release instant that has not seen it', () => {
    expect(isTourEligible({ ...fresh, created_at: new Date(Date.parse(TOUR_RELEASE)).toISOString() })).toBe(true);
    expect(isTourEligible(fresh)).toBe(true);
  });

  it('is false once the tour has been seen', () => {
    expect(isTourEligible({ ...fresh, seen_tips: ['tour'] })).toBe(false);
  });
});

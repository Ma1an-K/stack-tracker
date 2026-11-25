import { describe, it, expect } from 'vitest';
import { DEFAULT_INVITE_EXPIRY_DAYS, inviteExpiresAt } from './inviteExpiry';

const NOW = Date.parse('2026-11-25T00:00:00.000Z');

describe('inviteExpiresAt', () => {
  it('defaults to 14 days from now', () => {
    expect(DEFAULT_INVITE_EXPIRY_DAYS).toBe(14);
    expect(inviteExpiresAt(undefined, NOW)).toBe('2026-12-09T00:00:00.000Z');
  });

  it('uses an explicit number of days', () => {
    expect(inviteExpiresAt(1, NOW)).toBe('2026-11-26T00:00:00.000Z');
  });

  it('falls back to the default for zero, negative or non-finite values', () => {
    expect(inviteExpiresAt(0, NOW)).toBe('2026-12-09T00:00:00.000Z');
    expect(inviteExpiresAt(-3, NOW)).toBe('2026-12-09T00:00:00.000Z');
    expect(inviteExpiresAt(Number.NaN, NOW)).toBe('2026-12-09T00:00:00.000Z');
  });
});

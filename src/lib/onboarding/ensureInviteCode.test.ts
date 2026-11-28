import { describe, expect, it } from 'vitest';
import type { InviteCode } from '@/types/database';
import { inviteExpiresAt } from '@/lib/inviteExpiry';
import { pickInviteCode } from './ensureInviteCode';

const NOW = Date.parse('2026-11-28T12:00:00Z');
const DAY = 24 * 60 * 60 * 1000;

function code(overrides: Partial<InviteCode>): InviteCode {
  return {
    id: overrides.code ?? 'id',
    homegame_id: 'hg',
    code: 'AAAA1111',
    created_by: 'u',
    expires_at: inviteExpiresAt(undefined, NOW),
    max_uses: null,
    uses_count: 0,
    is_active: true,
    created_at: new Date(NOW - DAY).toISOString(),
    ...overrides,
  };
}

describe('pickInviteCode', () => {
  it('returns the newest active, unexpired code', () => {
    const older = code({ code: 'OLDER111', created_at: new Date(NOW - 3 * DAY).toISOString() });
    const newest = code({ code: 'NEWEST11', created_at: new Date(NOW - DAY).toISOString() });
    const middle = code({ code: 'MIDDLE11', created_at: new Date(NOW - 2 * DAY).toISOString() });
    expect(pickInviteCode([older, newest, middle], NOW)?.code).toBe('NEWEST11');
  });

  it('skips expired codes', () => {
    const expired = code({
      code: 'EXPIRED1',
      created_at: new Date(NOW - DAY).toISOString(),
      expires_at: inviteExpiresAt(14, NOW - 15 * DAY),
    });
    const valid = code({ code: 'VALID111', created_at: new Date(NOW - 5 * DAY).toISOString() });
    expect(pickInviteCode([expired, valid], NOW)?.code).toBe('VALID111');
  });

  it('skips inactive and used-up codes, and keeps codes with no expiry', () => {
    const inactive = code({ code: 'INACTIV1', is_active: false, created_at: new Date(NOW).toISOString() });
    const usedUp = code({ code: 'USEDUP11', max_uses: 3, uses_count: 3, created_at: new Date(NOW).toISOString() });
    const forever = code({ code: 'FOREVER1', expires_at: null, created_at: new Date(NOW - 9 * DAY).toISOString() });
    expect(pickInviteCode([inactive, usedUp, forever], NOW)?.code).toBe('FOREVER1');
  });

  it('returns null when there is no usable code', () => {
    expect(pickInviteCode([], NOW)).toBeNull();
    expect(pickInviteCode([code({ expires_at: new Date(NOW - 1).toISOString() })], NOW)).toBeNull();
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { Profile } from '@/types/database';

const mocks = vi.hoisted(() => ({
  profile: null as Partial<Profile> | null,
  updateProfile: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuthContext: () => ({ profile: mocks.profile, updateProfile: mocks.updateProfile }),
}));

import { useTips, clearLegacyTourKeys } from './useTips';

beforeEach(() => {
  mocks.profile = { id: 'u1', seen_tips: [] };
  mocks.updateProfile = vi.fn().mockResolvedValue({ error: null });
});

describe('useTips', () => {
  it('shows a tip the account has not seen', () => {
    const { result } = renderHook(() => useTips());
    expect(result.current.shouldShow('home-plus')).toBe(true);
  });

  it('hides a tip already in seen_tips', () => {
    mocks.profile = { id: 'u1', seen_tips: ['home-plus'] };
    const { result } = renderHook(() => useTips());
    expect(result.current.shouldShow('home-plus')).toBe(false);
    expect(result.current.shouldShow('mystats-member')).toBe(true);
  });

  it('shows nothing while the profile is loading', () => {
    mocks.profile = null;
    const { result } = renderHook(() => useTips());
    expect(result.current.shouldShow('home-plus')).toBe(false);
    expect(result.current.shouldShow('mystats-member')).toBe(false);
  });

  it('markSeen saves the tip to the account once and hides it right away', async () => {
    mocks.profile = { id: 'u1', seen_tips: ['mystats-member'] };
    let finish: (v: { error: null }) => void = () => {};
    mocks.updateProfile.mockReturnValue(new Promise((r) => { finish = r; }));
    const { result } = renderHook(() => useTips());

    let pending: Promise<void> = Promise.resolve();
    act(() => { pending = result.current.markSeen('home-plus'); });

    // Hidden before the save resolves.
    expect(result.current.shouldShow('home-plus')).toBe(false);
    expect(mocks.updateProfile).toHaveBeenCalledTimes(1);
    expect(mocks.updateProfile).toHaveBeenCalledWith({ seen_tips: ['mystats-member', 'home-plus'] });

    await act(async () => { finish({ error: null }); await pending; });
    expect(result.current.shouldShow('home-plus')).toBe(false);
  });
});

describe('clearLegacyTourKeys', () => {
  it('removes the old tour flags from localStorage', () => {
    const store = new Map([
      ['tutorial_owner_seen', '1'],
      ['tutorial_player_seen', '1'],
      ['currentHomegameId', 'hg-1'],
    ]);
    vi.stubGlobal('localStorage', { removeItem: (k: string) => store.delete(k) });
    clearLegacyTourKeys();
    expect([...store.keys()]).toEqual(['currentHomegameId']);
    vi.unstubAllGlobals();
  });

  it('does not throw when storage is blocked', () => {
    vi.stubGlobal('localStorage', { removeItem: () => { throw new Error('blocked'); } });
    expect(() => clearLegacyTourKeys()).not.toThrow();
    vi.unstubAllGlobals();
  });
});

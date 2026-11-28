import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { createSupabaseMock, type MockRequest } from '@/test/supabaseMock';
import type { HomegameWithRole } from '@/types/database';

const mocks = vi.hoisted(() => ({
  db: null as unknown as ReturnType<typeof import('@/test/supabaseMock').createSupabaseMock>,
  homegames: [] as HomegameWithRole[],
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (table: string) => mocks.db.from(table) },
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuthContext: () => ({ homegames: mocks.homegames }),
}));

import { useGettingStarted } from './useGettingStarted';

function game(overrides: Partial<HomegameWithRole> = {}): HomegameWithRole {
  return {
    id: 'hg-1',
    user_id: 'u1',
    name: 'Friday Night Game',
    currency: '$',
    icon_id: null,
    disabled_badges: null,
    created_at: '2026-12-05T10:00:00.000Z',
    updated_at: '2026-12-05T10:00:00.000Z',
    role: 'owner',
    ...overrides,
  } as HomegameWithRole;
}

const counts: Record<string, number> = { players: 3, homegame_members: 1, sessions: 0 };
function answer(r: MockRequest) {
  (r.resolve as (v: unknown) => void)({ data: null, error: null, count: counts[r.table] });
}

let store: Map<string, string>;
beforeEach(() => {
  mocks.db = createSupabaseMock();
  mocks.homegames = [game()];
  store = new Map();
  vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null });
});

describe('useGettingStarted', () => {
  it('counts active players, members and sessions for a new homegame the user owns', async () => {
    const { result } = renderHook(() => useGettingStarted('hg-1'));
    await waitFor(() => expect(mocks.db.pending()).toHaveLength(3));

    const [players] = mocks.db.find('players');
    expect(mocks.db.hasCall(players, 'select', '*')).toBe(true);
    expect(players.calls).toContainEqual(['select', '*', { count: 'exact', head: true }]);
    expect(mocks.db.hasCall(players, 'eq', 'homegame_id', 'hg-1')).toBe(true);
    expect(mocks.db.hasCall(players, 'eq', 'is_active', true)).toBe(true);
    expect(mocks.db.hasCall(mocks.db.find('homegame_members')[0], 'eq', 'homegame_id', 'hg-1')).toBe(true);
    expect(mocks.db.hasCall(mocks.db.find('sessions')[0], 'eq', 'homegame_id', 'hg-1')).toBe(true);

    expect(result.current.checklist.visible).toBe(false); // nothing shown until the counts arrive
    act(() => mocks.db.pending().forEach(answer));

    await waitFor(() => expect(result.current.checklist.visible).toBe(true));
    expect(result.current.checklist.doneCount).toBe(2);
    expect(result.current.sessionCount).toBe(0);
  });

  it('reads the invite-shared flag', async () => {
    store.set('invite_shared:hg-1', '1');
    const { result } = renderHook(() => useGettingStarted('hg-1'));
    await waitFor(() => expect(mocks.db.pending()).toHaveLength(3));
    act(() => mocks.db.pending().forEach(answer));
    await waitFor(() => expect(result.current.checklist.items.find((i) => i.id === 'invite')?.done).toBe(true));
  });

  it('ticks the invite right away when the card shares it', async () => {
    const { result } = renderHook(() => useGettingStarted('hg-1'));
    await waitFor(() => expect(mocks.db.pending()).toHaveLength(3));
    act(() => mocks.db.pending().forEach(answer));
    await waitFor(() => expect(result.current.checklist.visible).toBe(true));
    act(() => result.current.onInviteShared());
    expect(result.current.checklist.items.find((i) => i.id === 'invite')?.done).toBe(true);
  });

  it('only counts sessions for a homegame created before the cutoff', async () => {
    mocks.homegames = [game({ created_at: '2025-06-01T10:00:00.000Z' })];
    const { result } = renderHook(() => useGettingStarted('hg-1'));
    await waitFor(() => expect(mocks.db.pending()).toHaveLength(1));
    expect(mocks.db.find('sessions')).toHaveLength(1);
    act(() => mocks.db.pending().forEach(answer));
    await waitFor(() => expect(result.current.sessionCount).toBe(0));
    expect(result.current.checklist.visible).toBe(false);
  });

  it('makes no requests for a member', async () => {
    mocks.homegames = [game({ role: 'member' })];
    const { result } = renderHook(() => useGettingStarted('hg-1'));
    await new Promise((r) => setTimeout(r, 0));
    expect(mocks.db.requests).toHaveLength(0);
    expect(result.current.checklist.visible).toBe(false);
    expect(result.current.sessionCount).toBeNull();
  });

  it('stays hidden when a count fails', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useGettingStarted('hg-1'));
    await waitFor(() => expect(mocks.db.pending()).toHaveLength(3));
    act(() =>
      mocks.db.pending().forEach((r) =>
        r.table === 'sessions' ? r.resolve({ data: null, error: new Error('boom') }) : answer(r)
      )
    );
    await waitFor(() => expect(logged).toHaveBeenCalled());
    expect(result.current.checklist.visible).toBe(false);
    logged.mockRestore();
  });
});

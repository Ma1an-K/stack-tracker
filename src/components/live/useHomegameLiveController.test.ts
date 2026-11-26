import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const auth = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));
const live = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));

vi.mock('@/contexts/AuthContext', () => ({ useAuthContext: () => auth.value }));
vi.mock('@/contexts/LiveSessionContext', () => ({ useLiveSession: () => live.value }));
vi.mock('@/hooks/useHomegameMembers', () => ({
  useHomegameMembers: () => ({
    members: [
      { role: 'member', profile: { username: 'dana' } },
      { role: 'owner', profile: { username: 'matan' } },
    ],
  }),
}));

import { useHomegameLiveController } from './useHomegameLiveController';

const sam = { id: 'p-sam', name: 'Sam', is_active: true } as never;

function playersApi() {
  return {
    players: [sam],
    loading: false,
    addPlayer: vi.fn().mockResolvedValue({ error: null, player: sam }),
  };
}

const liveSession = {
  started_at: '2026-11-26T10:00:00Z',
  default_buy_in: 50,
  players: [{ player_id: 'p-sam', buy_in: 50 }],
  payments: [],
};

describe('useHomegameLiveController', () => {
  beforeEach(() => {
    auth.value = { homegame: { id: 'h1', currency: '£' }, isOwner: true };
    live.value = { liveSession, totalPot: 50, totalBuyIn: 50, seatedCount: 1 };
  });

  it('is null while no live session is running', () => {
    live.value = { liveSession: null };
    const { result } = renderHook(() => useHomegameLiveController(playersApi()));
    expect(result.current).toBeNull();
  });

  it('maps the homegame live session onto the controller', () => {
    const api = playersApi();
    const { result } = renderHook(() => useHomegameLiveController(api));
    const c = result.current!;
    expect(c.endHref).toBe('/new-session?from=live');
    expect(c.canCreatePlayer).toBe(true);
    expect(c.currency).toBe('£');
    expect(c.ownerName).toBe('matan');
    expect(c.roster).toBe(api.players);
    expect(c.defaultBuyIn).toBe(50);
    expect(c.startedAt).toBe('2026-11-26T10:00:00Z');
  });

  it('canCreatePlayer follows isOwner', () => {
    auth.value = { ...auth.value, isOwner: false };
    const { result } = renderHook(() => useHomegameLiveController(playersApi()));
    expect(result.current!.canCreatePlayer).toBe(false);
  });

  it('createPlayer delegates to the injected addPlayer', async () => {
    const api = playersApi();
    const { result } = renderHook(() => useHomegameLiveController(api));
    await expect(result.current!.createPlayer('Sam')).resolves.toEqual({ error: null, player: sam });
    expect(api.addPlayer).toHaveBeenCalledWith('Sam');
  });
});

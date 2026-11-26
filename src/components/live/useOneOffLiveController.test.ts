import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { OneOffGame } from '@/lib/oneOff/types';

const dispatch = vi.fn((): { error: string | null } => ({ error: null }));
let game: OneOffGame | null = null;

vi.mock('@/contexts/OneOffGameContext', () => ({
  useOneOffGame: () => ({ game, dispatch, seatedCount: 1, totalBuyIn: 70, totalPot: 40, storageOk: true }),
}));
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }));

import { useOneOffLiveController } from './useOneOffLiveController';

beforeEach(() => {
  dispatch.mockClear();
  game = {
    version: 1,
    mode: 'live',
    label: '',
    played_on: '2026-11-26',
    currency: '€',
    notes: '',
    default_buy_in: 20,
    started_at: '2026-11-26T08:00:00.000Z',
    players: [
      { id: 'ann', name: 'Ann', buy_in: 50, cash_out: 30 },
      { id: 'ben', name: 'Ben', buy_in: 20, cash_out: null },
    ],
    payments: [{ from_id: 'ann', to_id: 'ben', amount: 20 }],
  };
});

describe('useOneOffLiveController', () => {
  it('is null with no game', () => {
    game = null;
    const { result } = renderHook(() => useOneOffLiveController());
    expect(result.current).toBeNull();
  });

  it('maps players, payments and roster to the tracker shape', () => {
    const c = renderHook(() => useOneOffLiveController()).result.current!;
    expect(c.players).toEqual([
      { player_id: 'ann', buy_in: 50, cash_out: 30 },
      { player_id: 'ben', buy_in: 20 },
    ]);
    expect(c.payments).toEqual([{ from_player_id: 'ann', to_player_id: 'ben', amount: 20 }]);
    expect(c.roster).toEqual([
      { id: 'ann', name: 'Ann', is_active: true },
      { id: 'ben', name: 'Ben', is_active: true },
    ]);
    expect(c.canCreatePlayer).toBe(true);
    expect(c.ownerName).toBeNull();
    expect(c.endHref).toBe('/one-off/settle');
    expect(c.currency).toBe('€');
  });

  it('createPlayer adds the name with nothing in, then addPlayer sets that buy-in', async () => {
    const c = renderHook(() => useOneOffLiveController()).result.current!;
    const { error, player } = await c.createPlayer(' Cy ');
    expect(error).toBeNull();
    expect(player).toMatchObject({ name: 'Cy', is_active: true });
    expect(dispatch).toHaveBeenLastCalledWith({ type: 'addPlayer', id: player!.id, name: ' Cy ', buyIn: 0 });

    await c.addPlayer(player!.id, 20);
    expect(dispatch).toHaveBeenLastCalledWith({ type: 'setBuyIn', id: player!.id, total: 20 });
  });

  it('returns the reducer error and no player when the name is refused', async () => {
    dispatch.mockReturnValueOnce({ error: 'Two players are called Ann' });
    const c = renderHook(() => useOneOffLiveController()).result.current!;
    expect(await c.createPlayer('ann')).toEqual({ error: 'Two players are called Ann', player: null });
  });

  it('maps a recorded payment back to from_id / to_id', async () => {
    const c = renderHook(() => useOneOffLiveController()).result.current!;
    await c.addPayment({ from_player_id: 'ben', to_player_id: 'ann', amount: 5 });
    expect(dispatch).toHaveBeenLastCalledWith({
      type: 'addPayment',
      payment: { from_id: 'ben', to_id: 'ann', amount: 5 },
    });
  });
});

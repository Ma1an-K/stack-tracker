import { describe, it, expect } from 'vitest';
import type { Player, SessionPlayerWithDetails } from '@/types/database';
import { settleSession, type SessionSettlement } from './settle';

const player = (id: string): Player => ({
  id,
  homegame_id: 'hg',
  name: id.toUpperCase(),
  is_active: true,
  user_id: null,
  created_at: '',
  updated_at: '',
});

const sp = (id: string, buy_in: number, cash_out: number): SessionPlayerWithDetails => ({
  id: `sp-${id}`,
  session_id: 's',
  player_id: id,
  buy_in,
  cash_out,
  created_at: '',
  updated_at: '',
  player: player(id),
});

const pay = (from: string, to: string, amount: number) => ({ from_player_id: from, to_player_id: to, amount });

const flat = (result: SessionSettlement) => {
  if (result.status !== 'settled') throw new Error(`refused: ${JSON.stringify(result.reason)}`);
  return result.transfers.map(t => `${t.from.name}->${t.to.name}:${t.amount}`);
};

describe('settleSession', () => {
  it('gives Transfers between the Session\'s Player records', () => {
    const result = settleSession([sp('a', 100, 50), sp('b', 100, 130), sp('c', 100, 120)]);
    expect(flat(result)).toEqual(['A->B:30', 'A->C:20']);
  });

  it('nets Payments made during the game', () => {
    const result = settleSession([sp('a', 100, 0), sp('b', 0, 100)], [pay('a', 'b', 60)]);
    expect(flat(result)).toEqual(['A->B:40']);
  });

  it('gives each Player\'s Profit by Player id, unchanged by Payments', () => {
    const result = settleSession([sp('a', 100, 0), sp('b', 0, 100)], [pay('a', 'b', 60)]);
    if (result.status !== 'settled') throw new Error('refused');
    expect(result.profits.get('a')).toBe(-100);
    expect(result.profits.get('b')).toBe(100);
  });

  it('keeps a 1-cent Transfer', () => {
    expect(flat(settleSession([sp('a', 10, 9.99), sp('b', 10, 10.01)]))).toEqual(['A->B:0.01']);
  });

  it('refuses an unbalanced Session with the signed difference', () => {
    expect(settleSession([sp('a', 100, 50), sp('b', 100, 140)])).toMatchObject({
      status: 'refused',
      reason: { rule: 'unbalanced', difference: -10 },
    });
  });

  it('refuses a Payment naming a Player not in the Session', () => {
    const result = settleSession([sp('a', 100, 0), sp('b', 0, 100)], [pay('a', 'z', 10)]);
    expect(result.status === 'refused' && result.reason.rule).toBe('unknown-player');
  });
});

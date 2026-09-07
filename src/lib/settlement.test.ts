import { describe, it, expect } from 'vitest';
import { calculateSettlements } from './settlement';
import { Player, SessionPlayerWithDetails } from '@/types/database';

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

const flat = (s: ReturnType<typeof calculateSettlements>) =>
  s.map(x => `${x.from.id}->${x.to.id}:${x.amount}`);

describe('calculateSettlements', () => {
  // a lost 50, b won 30, c won 20
  const players = [sp('a', 100, 50), sp('b', 100, 130), sp('c', 100, 120)];

  it('with no payments matches the plain greedy result', () => {
    expect(flat(calculateSettlements(players))).toEqual(['a->b:30', 'a->c:20']);
    expect(flat(calculateSettlements(players, []))).toEqual(['a->b:30', 'a->c:20']);
  });

  it('a full payment removes the leaver from remaining transfers', () => {
    // a already paid b 50 in cash. b is now up 20 more than they won, so b owes c 20.
    const result = calculateSettlements(players, [
      { from_player_id: 'a', to_player_id: 'b', amount: 50 },
    ]);
    expect(flat(result)).toEqual(['b->c:20']);
  });

  it('a partial payment reduces the remaining amount', () => {
    const result = calculateSettlements(players, [
      { from_player_id: 'a', to_player_id: 'b', amount: 20 },
    ]);
    // a still owes 30 total; b is still owed 10; c is owed 20
    expect(flat(result)).toEqual(['a->c:20', 'a->b:10']);
  });

  it('an overpayment reverses direction', () => {
    const result = calculateSettlements(players, [
      { from_player_id: 'a', to_player_id: 'b', amount: 80 },
    ]);
    // a overpaid by 30 and is now owed 30; b holds 50 too much and owes c 20 and a 30
    expect(flat(result)).toEqual(['b->a:30', 'b->c:20']);
  });

  it('ignores payments involving a player not in the session', () => {
    const result = calculateSettlements(players, [
      { from_player_id: 'a', to_player_id: 'zzz', amount: 50 },
      { from_player_id: 'zzz', to_player_id: 'b', amount: 50 },
    ]);
    expect(flat(result)).toEqual(['a->b:30', 'a->c:20']);
  });

  it('a payment between two winners still nets correctly', () => {
    // c paid b 20. c was owed 20 and paid 20 away, so c is now owed 40; b is owed 10.
    const result = calculateSettlements(players, [
      { from_player_id: 'c', to_player_id: 'b', amount: 20 },
    ]);
    expect(flat(result)).toEqual(['a->c:40', 'a->b:10']);
  });

  it('returns nothing when everything was settled during the game', () => {
    const result = calculateSettlements(players, [
      { from_player_id: 'a', to_player_id: 'b', amount: 30 },
      { from_player_id: 'a', to_player_id: 'c', amount: 20 },
    ]);
    expect(result).toEqual([]);
  });
});

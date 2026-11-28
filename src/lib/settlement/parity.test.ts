import { describe, it, expect } from 'vitest';
import type { SessionPlayerWithDetails } from '@/types/database';
import { settleSession } from '@/lib/sessions/settle';
import { settleOneOffGame } from '@/lib/oneOff/settle';
import { settleCalculatorRows } from '@/lib/calculator/settle';

// One game, written once, then mapped into each caller's shape.
interface ParityGame {
  players: { id: string; buyIn: number; cashOut: number }[];
  payments?: { fromId: string; toId: string; amount: number }[];
}

const viaSession = ({ players, payments = [] }: ParityGame) => {
  const sessionPlayers: SessionPlayerWithDetails[] = players.map(p => ({
    id: `sp-${p.id}`,
    session_id: 's',
    player_id: p.id,
    buy_in: p.buyIn,
    cash_out: p.cashOut,
    created_at: '',
    updated_at: '',
    player: { id: p.id, homegame_id: 'hg', name: p.id, is_active: true, user_id: null, created_at: '', updated_at: '' },
  }));
  const result = settleSession(
    sessionPlayers,
    payments.map(p => ({ from_player_id: p.fromId, to_player_id: p.toId, amount: p.amount })),
  );
  if (result.status !== 'settled') throw new Error(`refused: ${JSON.stringify(result.reason)}`);
  return result.transfers.map(t => `${t.from.id}->${t.to.id}:${t.amount}`);
};

const viaOneOff = ({ players, payments = [] }: ParityGame) => {
  const result = settleOneOffGame(
    players.map(p => ({ id: p.id, buy_in: p.buyIn, cash_out: p.cashOut })),
    payments.map(p => ({ from_id: p.fromId, to_id: p.toId, amount: p.amount })),
  );
  if (result.status !== 'settled') throw new Error(`refused: ${JSON.stringify(result.reason)}`);
  return result.transfers.map(t => `${t.from_id}->${t.to_id}:${t.amount}`);
};

// The calculator has no Payments and names rows rather than ids, so each row is named after its id.
const viaCalculator = ({ players }: ParityGame) => {
  const result = settleCalculatorRows(players.map(p => ({ id: p.id, name: p.id, buyIn: p.buyIn, cashOut: p.cashOut })));
  if (result.status !== 'settled') throw new Error(`refused: ${JSON.stringify(result.reason)}`);
  return result.transfers.map(t => `${t.fromName}->${t.toName}:${t.amount}`);
};

describe('every caller settles the same game the same way', () => {
  it('a game with odd cents that drift in floating point', () => {
    const game = { players: [{ id: 'a', buyIn: 10.1, cashOut: 0 }, { id: 'b', buyIn: 20.2, cashOut: 0 }, { id: 'c', buyIn: 0, cashOut: 30.3 }] };
    const expected = ['b->c:20.2', 'a->c:10.1'];
    expect(viaSession(game)).toEqual(expected);
    expect(viaOneOff(game)).toEqual(expected);
    expect(viaCalculator(game)).toEqual(expected);
  });

  it('a three-way 33.33 game', () => {
    const game = { players: [{ id: 'a', buyIn: 33.33, cashOut: 99.99 }, { id: 'b', buyIn: 33.33, cashOut: 0 }, { id: 'c', buyIn: 33.33, cashOut: 0 }] };
    const expected = ['b->a:33.33', 'c->a:33.33'];
    expect(viaSession(game)).toEqual(expected);
    expect(viaOneOff(game)).toEqual(expected);
    expect(viaCalculator(game)).toEqual(expected);
  });

  it('a game with a Payment made during it (Session and One-off game only)', () => {
    const game = {
      players: [{ id: 'a', buyIn: 100, cashOut: 50 }, { id: 'b', buyIn: 100, cashOut: 130 }, { id: 'c', buyIn: 100, cashOut: 120 }],
      payments: [{ fromId: 'a', toId: 'b', amount: 20 }],
    };
    const expected = ['a->c:20', 'a->b:10'];
    expect(viaSession(game)).toEqual(expected);
    expect(viaOneOff(game)).toEqual(expected);
  });
});

import { describe, it, expect } from 'vitest';
import { oneOffReducer } from './reducer';
import type { OneOffGame } from './types';

const base: OneOffGame = {
  version: 1,
  mode: 'live',
  label: '',
  played_on: '2026-11-26',
  currency: '$',
  notes: '',
  default_buy_in: 50,
  started_at: '2026-11-26T09:00:00.000Z',
  players: [
    { id: 'a', name: 'Dan', buy_in: 50, cash_out: null },
    { id: 'b', name: 'Sam', buy_in: 50, cash_out: null },
  ],
  payments: [],
};

const player = (state: OneOffGame, id: string) => state.players.find(p => p.id === id)!;

describe('oneOffReducer: buy-ins and cash-outs', () => {
  it('follows homegame live semantics through a buy-in, cash-out and rejoin round trip', () => {
    let r = oneOffReducer(base, { type: 'addBuyIn', id: 'a', amount: 25.5 });
    expect(r.error).toBeNull();
    expect(player(r.state, 'a').buy_in).toBe(75.5);

    r = oneOffReducer(r.state, { type: 'addBuyIn', id: 'a', amount: -200 });
    expect(player(r.state, 'a').buy_in).toBe(0);

    r = oneOffReducer(r.state, { type: 'setBuyIn', id: 'a', total: 100 });
    expect(player(r.state, 'a').buy_in).toBe(100);

    r = oneOffReducer(r.state, { type: 'cashOut', id: 'a', amount: 140 });
    expect(player(r.state, 'a').cash_out).toBe(140);
    expect(player(r.state, 'b').cash_out).toBeNull();

    r = oneOffReducer(r.state, { type: 'rejoin', id: 'a' });
    expect(r.error).toBeNull();
    expect(player(r.state, 'a').cash_out).toBeNull();
    expect(player(r.state, 'a').buy_in).toBe(100);
  });

  it('setCashOut records a cash-out without dropping below 0', () => {
    let r = oneOffReducer(base, { type: 'setCashOut', id: 'b', amount: 80 });
    expect(player(r.state, 'b').cash_out).toBe(80);
    r = oneOffReducer(r.state, { type: 'setCashOut', id: 'b', amount: -5 });
    expect(player(r.state, 'b').cash_out).toBe(0);
  });

  it('does not mutate the previous state', () => {
    const before = structuredClone(base);
    oneOffReducer(base, { type: 'addBuyIn', id: 'a', amount: 10 });
    expect(base).toEqual(before);
  });

  it('rejects an unknown player', () => {
    const r = oneOffReducer(base, { type: 'cashOut', id: 'zz', amount: 10 });
    expect(r.error).toBe('That player is not in this game');
    expect(r.state).toBe(base);
  });
});

describe('oneOffReducer: players', () => {
  it('addPlayer adds a seated player with a trimmed name', () => {
    const r = oneOffReducer(base, { type: 'addPlayer', id: 'c', name: '  Lee ', buyIn: 50 });
    expect(r.error).toBeNull();
    expect(r.state.players).toHaveLength(3);
    expect(player(r.state, 'c')).toEqual({ id: 'c', name: 'Lee', buy_in: 50, cash_out: null });
  });

  it('addPlayer rejects a blank or duplicate name', () => {
    let r = oneOffReducer(base, { type: 'addPlayer', id: 'c', name: '   ', buyIn: 50 });
    expect(r.error).toBe('Every player needs a name');
    expect(r.state).toBe(base);

    r = oneOffReducer(base, { type: 'addPlayer', id: 'c', name: 'dan', buyIn: 50 });
    expect(r.error).toBe('Two players are called dan');
    expect(r.state).toBe(base);
  });

  it('renamePlayer renames, and rejects a blank or duplicate name', () => {
    let r = oneOffReducer(base, { type: 'renamePlayer', id: 'a', name: ' Danny ' });
    expect(r.error).toBeNull();
    expect(player(r.state, 'a').name).toBe('Danny');

    r = oneOffReducer(base, { type: 'renamePlayer', id: 'a', name: '' });
    expect(r.error).toBe('Every player needs a name');
    expect(r.state).toBe(base);

    r = oneOffReducer(base, { type: 'renamePlayer', id: 'a', name: 'SAM' });
    expect(r.error).toBe('Two players are called SAM');
    expect(r.state).toBe(base);
  });

  it('renaming a player to their own name in another case is allowed', () => {
    const r = oneOffReducer(base, { type: 'renamePlayer', id: 'a', name: 'DAN' });
    expect(r.error).toBeNull();
    expect(player(r.state, 'a').name).toBe('DAN');
  });

  it('removePlayer removes a player with no payments', () => {
    const r = oneOffReducer(base, { type: 'removePlayer', id: 'b' });
    expect(r.error).toBeNull();
    expect(r.state.players.map(p => p.id)).toEqual(['a']);
  });

  it('removePlayer refuses when a payment involves them', () => {
    const withPayment: OneOffGame = {
      ...base,
      payments: [{ from_id: 'a', to_id: 'b', amount: 20 }],
    };
    for (const id of ['a', 'b']) {
      const r = oneOffReducer(withPayment, { type: 'removePlayer', id });
      expect(r.error).toBe('Remove their payments first');
      expect(r.state).toBe(withPayment);
    }
  });
});

describe('oneOffReducer: payments and details', () => {
  it('addPayment records a payment rounded to cents, and removePayment drops it by index', () => {
    let r = oneOffReducer(base, {
      type: 'addPayment',
      payment: { from_id: 'a', to_id: 'b', amount: 20.005 },
    });
    expect(r.error).toBeNull();
    expect(r.state.payments).toEqual([{ from_id: 'a', to_id: 'b', amount: 20.01 }]);

    r = oneOffReducer(r.state, { type: 'removePayment', index: 0 });
    expect(r.error).toBeNull();
    expect(r.state.payments).toEqual([]);
  });

  it('addPayment rejects a payment to yourself', () => {
    const r = oneOffReducer(base, {
      type: 'addPayment',
      payment: { from_id: 'a', to_id: 'a', amount: 20 },
    });
    expect(r.error).toBe('Pick two different players');
    expect(r.state).toBe(base);
  });

  it('addPayment rejects an amount of 0 or less', () => {
    for (const amount of [0, -5, 0.004, Number.NaN]) {
      const r = oneOffReducer(base, {
        type: 'addPayment',
        payment: { from_id: 'a', to_id: 'b', amount },
      });
      expect(r.error).toBe('Enter an amount above 0');
      expect(r.state).toBe(base);
    }
  });

  it('addPayment rejects a player not in the game', () => {
    const r = oneOffReducer(base, {
      type: 'addPayment',
      payment: { from_id: 'a', to_id: 'zz', amount: 20 },
    });
    expect(r.error).toBe('That player is not in this game');
    expect(r.state).toBe(base);
  });

  it('removePayment rejects an index that does not exist', () => {
    const r = oneOffReducer(base, { type: 'removePayment', index: 0 });
    expect(r.error).toBe('That payment is not in this game');
    expect(r.state).toBe(base);
  });

  it('setMeta patches label, date, currency and notes', () => {
    const r = oneOffReducer(base, {
      type: 'setMeta',
      patch: { label: 'Friday', notes: 'At Dan’s', currency: '€', played_on: '2026-11-25' },
    });
    expect(r.error).toBeNull();
    expect(r.state).toMatchObject({
      label: 'Friday',
      notes: 'At Dan’s',
      currency: '€',
      played_on: '2026-11-25',
    });
    expect(r.state.players).toBe(base.players);
  });

  it('start replaces the whole game', () => {
    const next: OneOffGame = { ...base, mode: 'totals', players: [] };
    const r = oneOffReducer(base, { type: 'start', game: next });
    expect(r.error).toBeNull();
    expect(r.state).toBe(next);
  });
});

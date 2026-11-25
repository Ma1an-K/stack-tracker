import { describe, it, expect } from 'vitest';
import { settleOneOff } from './settle';
import { computePublicSettlement } from '@/lib/publicSettlement';

const p = (id: string, buy_in: number, cash_out: number) => ({ id, buy_in, cash_out });

describe('settleOneOff', () => {
  it('matches the public calculator when there are no payments', () => {
    const players = [p('a', 100, 0), p('b', 100, 150), p('c', 100, 150)];
    const result = settleOneOff(players, []);

    const nameToId = new Map(players.map(x => [x.id.toUpperCase(), x.id]));
    const expected = computePublicSettlement(
      players.map(x => ({ id: x.id, name: x.id.toUpperCase(), buyIn: x.buy_in, cashOut: x.cash_out })),
    ).transfers.map(t => ({
      from_id: nameToId.get(t.fromName),
      to_id: nameToId.get(t.toName),
      amount: t.amount,
    }));

    expect(result.transfers).toEqual(expected);
    expect(result.transfers).toEqual([
      { from_id: 'a', to_id: 'b', amount: 50 },
      { from_id: 'a', to_id: 'c', amount: 50 },
    ]);
    expect(result.totalBuyIn).toBe(300);
    expect(result.totalCashOut).toBe(300);
    expect(result.difference).toBe(0);
    expect(result.balanced).toBe(true);
  });

  it('payments already made reduce what is owed', () => {
    const result = settleOneOff([p('a', 100, 0), p('b', 0, 100)], [
      { from_id: 'a', to_id: 'b', amount: 60 },
    ]);
    expect(result.transfers).toEqual([{ from_id: 'a', to_id: 'b', amount: 40 }]);
  });

  it('a fully paid game has no transfers', () => {
    const result = settleOneOff([p('a', 100, 0), p('b', 0, 100)], [
      { from_id: 'a', to_id: 'b', amount: 100 },
    ]);
    expect(result.transfers).toEqual([]);
    expect(result.balanced).toBe(true);
  });

  it('unbalanced totals return no transfers', () => {
    const result = settleOneOff([p('a', 100, 0), p('b', 100, 195)], []);
    expect(result.balanced).toBe(false);
    expect(result.difference).toBe(-5);
    expect(result.transfers).toEqual([]);
  });

  it('float drift within 0.01 counts as balanced', () => {
    const result = settleOneOff([p('a', 33.33, 99.99), p('b', 33.33, 0), p('c', 33.33, 0)], []);
    expect(result.balanced).toBe(true);
    expect(result.transfers).toHaveLength(2);
  });

  it('payments naming an unknown player are ignored', () => {
    const result = settleOneOff([p('a', 100, 0), p('b', 0, 100)], [
      { from_id: 'a', to_id: 'ghost', amount: 60 },
      { from_id: 'ghost', to_id: 'b', amount: 30 },
    ]);
    expect(result.transfers).toEqual([{ from_id: 'a', to_id: 'b', amount: 100 }]);
  });
});

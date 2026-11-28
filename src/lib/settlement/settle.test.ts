import { describe, it, expect } from 'vitest';
import { describeRefusal, isBalanced, settle, summaryOf, type Game, type Settled } from './settle';

const p = (id: string, buyIn: number, cashOut: number) => ({ id, buyIn, cashOut });
const pay = (fromId: string, toId: string, amount: number) => ({ fromId, toId, amount });

const settled = (game: Game) => {
  const result = settle(game);
  if (result.status !== 'settled') throw new Error(`refused: ${JSON.stringify(result.reason)}`);
  return result;
};
const flat = (result: Settled) =>
  result.transfers.map(t => `${t.fromId}->${t.toId}:${t.amount}`);

describe('settle', () => {
  // a lost 50, b won 30, c won 20
  const players = [p('a', 100, 50), p('b', 100, 130), p('c', 100, 120)];

  it('pairs the biggest loser with the biggest winner first', () => {
    expect(flat(settled({ players }))).toEqual(['a->b:30', 'a->c:20']);
  });

  it('splits one loss between two equal winners in input order', () => {
    const result = settled({ players: [p('a', 100, 0), p('b', 100, 150), p('c', 100, 150)] });
    expect(flat(result)).toEqual(['a->b:50', 'a->c:50']);
    expect(result.totalBuyIn).toBe(300);
    expect(result.totalCashOut).toBe(300);
  });

  it('a partial Payment between two Players leaves the rest to pay', () => {
    const two = [p('a', 100, 0), p('b', 0, 100)];
    expect(flat(settled({ players: two, payments: [pay('a', 'b', 60)] }))).toEqual(['a->b:40']);
    expect(settled({ players: two, payments: [pay('a', 'b', 100)] }).transfers).toEqual([]);
  });

  it('Payments that cancel each other out change nothing', () => {
    const payments = [pay('a', 'b', 1), pay('b', 'a', 1), pay('a', 'b', 1), pay('b', 'a', 1)];
    expect(flat(settled({ players, payments }))).toEqual(['a->b:30', 'a->c:20']);
  });

  it('a Payment already made reduces the remaining amount', () => {
    // a still owes 30 in total; b is still owed 10; c is owed 20
    expect(flat(settled({ players, payments: [pay('a', 'b', 20)] }))).toEqual(['a->c:20', 'a->b:10']);
  });

  it('a full Payment takes the early leaver out of the Transfers', () => {
    // a paid b 50: b now holds 20 more than they won, so b owes c 20
    expect(flat(settled({ players, payments: [pay('a', 'b', 50)] }))).toEqual(['b->c:20']);
  });

  it('an overpaid Payment leaves the payer owed money back', () => {
    // a overpaid by 30; b holds 50 too much and owes a 30 and c 20
    expect(flat(settled({ players, payments: [pay('a', 'b', 80)] }))).toEqual(['b->a:30', 'b->c:20']);
  });

  it('a Payment between two winners still nets correctly', () => {
    // c paid b 20: c is now owed 40, b is owed 10
    expect(flat(settled({ players, payments: [pay('c', 'b', 20)] }))).toEqual(['a->c:40', 'a->b:10']);
  });

  it('Payments that square everyone leave no Transfers', () => {
    expect(settled({ players, payments: [pay('a', 'b', 30), pay('a', 'c', 20)] }).transfers).toEqual([]);
  });

  it('keeps a 1-cent Transfer', () => {
    expect(flat(settled({ players: [p('a', 10, 9.99), p('b', 10, 10.01)] }))).toEqual(['a->b:0.01']);
  });

  it('settles a three-way 33.33 game exactly', () => {
    const result = settled({ players: [p('a', 33.33, 99.99), p('b', 33.33, 0), p('c', 33.33, 0)] });
    expect(flat(result)).toEqual(['b->a:33.33', 'c->a:33.33']);
    expect(result.totalBuyIn).toBe(99.99);
    expect(result.totalCashOut).toBe(99.99);
  });

  it('settles odd-cent amounts that drift in floating point', () => {
    // 0.1 + 0.2 style drift: 10.1 + 20.2 is not exactly 30.3 in floats
    const result = settled({ players: [p('a', 10.1, 0), p('b', 20.2, 0), p('c', 0, 30.3)] });
    expect(flat(result)).toEqual(['b->c:20.2', 'a->c:10.1']);
  });

  it("gives each Player's Profit for the game, before Payments", () => {
    const result = settled({ players, payments: [pay('a', 'b', 20)] });
    expect([...result.profits]).toEqual([['a', -50], ['b', 30], ['c', 20]]);
  });

  it('gives Profit in exact cents', () => {
    const result = settled({ players: [p('a', 10.1, 0), p('b', 20.2, 0), p('c', 0, 30.3)] });
    expect([...result.profits]).toEqual([['a', -10.1], ['b', -20.2], ['c', 30.3]]);
  });

  it('settles an empty game with nothing to pay', () => {
    expect(settled({ players: [] })).toEqual({
      status: 'settled',
      transfers: [],
      totalBuyIn: 0,
      totalCashOut: 0,
      profits: new Map(),
    });
  });

  it('settles a game where everyone breaks even with no Transfers', () => {
    const result = settled({ players: [p('a', 50, 50), p('b', 20, 20)] });
    expect(result.transfers).toEqual([]);
    expect([...result.profits]).toEqual([['a', 0], ['b', 0]]);
  });

  describe('refuses', () => {
    it('a game whose Cash-outs are short, with the signed difference', () => {
      expect(settle({ players: [p('a', 100, 0), p('b', 100, 195)] })).toMatchObject({
        status: 'refused',
        reason: { rule: 'unbalanced', difference: -5 },
      });
    });

    it('a game whose Cash-outs are over by a cent', () => {
      expect(settle({ players: [p('a', 33.33, 0), p('b', 33.33, 66.67)] })).toMatchObject({
        status: 'refused',
        reason: { rule: 'unbalanced', difference: 0.01 },
      });
    });

    it('a Payment naming a Player not in the game', () => {
      expect(settle({ players, payments: [pay('a', 'b', 10), pay('a', 'ghost', 50)] })).toMatchObject({
        status: 'refused',
        reason: { rule: 'unknown-player', paymentIndex: 1, playerId: 'ghost' },
      });
      expect(settle({ players, payments: [pay('ghost', 'b', 50)] })).toMatchObject({
        status: 'refused',
        reason: { rule: 'unknown-player', paymentIndex: 0, playerId: 'ghost' },
      });
    });

    it('a Payment from a Player to themselves', () => {
      expect(settle({ players, payments: [pay('a', 'a', 10)] })).toMatchObject({
        status: 'refused',
        reason: { rule: 'self-payment', paymentIndex: 0, playerId: 'a' },
      });
    });

    it('a Payment of zero or less', () => {
      for (const amount of [0, -5, 0.004]) {
        expect(settle({ players, payments: [pay('a', 'b', amount)] })).toMatchObject({
          status: 'refused',
          reason: { rule: 'non-positive-payment', paymentIndex: 0 },
        });
      }
    });

    it('a negative Buy-in or Cash-out, with no totals or Profits', () => {
      expect(settle({ players: [p('a', -10, 0), p('b', 0, -10)] })).toEqual({
        status: 'refused',
        reason: { rule: 'negative-amount', playerId: 'a' },
      });
      expect(settle({ players: [p('a', 10, 20), p('b', 0, -10)] })).toEqual({
        status: 'refused',
        reason: { rule: 'negative-amount', playerId: 'b' },
      });
    });

    it('a Player id that appears twice, with no totals or Profits', () => {
      expect(settle({ players: [p('a', 10, 0), p('b', 0, 20), p('a', 10, 0)] })).toEqual({
        status: 'refused',
        reason: { rule: 'duplicate-player', playerId: 'a' },
      });
    });
  });

  describe('a refused game whose Players are valid still has', () => {
    it('its totals and each Player\'s Profit when unbalanced', () => {
      const result = settle({ players: [p('a', 100, 0), p('b', 100, 195)] });
      expect(result).toEqual({
        status: 'refused',
        reason: { rule: 'unbalanced', difference: -5 },
        totalBuyIn: 200,
        totalCashOut: 195,
        profits: new Map([['a', -100], ['b', 95]]),
      });
      expect(summaryOf(result)).toBe(result);
    });

    it('its totals and Profits when a Payment is invalid', () => {
      for (const payment of [pay('a', 'ghost', 5), pay('a', 'a', 5), pay('a', 'b', 0)]) {
        const result = settle({ players, payments: [payment] });
        expect(result.status).toBe('refused');
        expect(summaryOf(result)).toMatchObject({
          totalBuyIn: 300,
          totalCashOut: 300,
          profits: new Map([['a', -50], ['b', 30], ['c', 20]]),
        });
      }
    });

    it('no summary when a Player is invalid', () => {
      expect(summaryOf(settle({ players: [p('a', -10, 0)] }))).toBeNull();
      expect(summaryOf(settle({ players: [p('a', 10, 0), p('a', 0, 10)] }))).toBeNull();
    });

    it('the same summary as a settled game', () => {
      const result = settled({ players });
      expect(summaryOf(result)).toBe(result);
    });
  });
});

describe('describeRefusal', () => {
  it('says which way and by how much an unbalanced game is out', () => {
    expect(describeRefusal({ rule: 'unbalanced', difference: -5 }, 'A$')).toBe('Cash-outs are A$5.00 short');
    expect(describeRefusal({ rule: 'unbalanced', difference: 0.01 })).toBe('Cash-outs are $0.01 over');
  });

  it('names the rule for every other refusal', () => {
    expect(describeRefusal({ rule: 'duplicate-player', playerId: 'a' })).toBe('A player is listed twice');
    expect(describeRefusal({ rule: 'negative-amount', playerId: 'a' })).toBe('A buy-in or cash-out is negative');
    expect(describeRefusal({ rule: 'unknown-player', paymentIndex: 0, playerId: 'x' })).toBe(
      "A payment names a player who isn't in this game",
    );
    expect(describeRefusal({ rule: 'self-payment', paymentIndex: 0, playerId: 'a' })).toBe(
      'A payment goes from a player to themselves',
    );
    expect(describeRefusal({ rule: 'non-positive-payment', paymentIndex: 0 })).toBe(
      'A payment must be more than zero',
    );
  });
});

describe('isBalanced', () => {
  it('is equal to the cent, so a 1-cent gap that float maths hides is not Balanced', () => {
    expect(isBalanced(66 + 219.36, 65.99 + 219.36)).toBe(false);
    expect(settle({ players: [p('a', 66, 65.99), p('b', 219.36, 219.36)] }).status).toBe('refused');
  });

  it('ignores float drift below a cent', () => {
    expect(isBalanced(10.1 + 20.2, 30.3)).toBe(true);
  });
});

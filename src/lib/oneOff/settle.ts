import type { OneOffPayment, OneOffTransfer } from './types';

export interface OneOffSettlement {
  totalBuyIn: number;
  totalCashOut: number;
  /** Cash-outs minus buy-ins. */
  difference: number;
  balanced: boolean;
  transfers: OneOffTransfer[];
}

/**
 * Compute who pays whom at the end of a one-off game.
 *
 * `payments` are transfers that already happened during the game. Each one
 * reduces the payer's outstanding debt and the payee's outstanding credit
 * before pairing, as in `calculateSettlements`. Payments naming a player who
 * isn't in the game are ignored. Pairing is largest-first, as in
 * `computePublicSettlement`. When the totals don't balance (within 0.01) no
 * transfers are returned.
 */
export function settleOneOff(
  players: { id: string; buy_in: number; cash_out: number }[],
  payments: OneOffPayment[],
): OneOffSettlement {
  const totalBuyIn = players.reduce((s, p) => s + p.buy_in, 0);
  const totalCashOut = players.reduce((s, p) => s + p.cash_out, 0);
  const difference = totalCashOut - totalBuyIn;
  const balanced = Math.abs(difference) <= 0.01;

  if (!balanced) {
    return { totalBuyIn, totalCashOut, difference, balanced, transfers: [] };
  }

  // balance > 0: lost and still owes; balance < 0: won and is still owed.
  const balance = new Map<string, number>();
  for (const p of players) balance.set(p.id, p.buy_in - p.cash_out);

  for (const pay of payments) {
    const from = balance.get(pay.from_id);
    const to = balance.get(pay.to_id);
    if (from === undefined || to === undefined) continue;
    balance.set(pay.from_id, from - pay.amount);
    balance.set(pay.to_id, to + pay.amount);
  }

  const entries = Array.from(balance, ([id, remaining]) => ({ id, remaining }));
  const debtors = entries
    .filter(e => e.remaining > 0.005)
    .sort((a, b) => b.remaining - a.remaining);
  const creditors = entries
    .filter(e => e.remaining < -0.005)
    .map(e => ({ id: e.id, remaining: -e.remaining }))
    .sort((a, b) => b.remaining - a.remaining);

  const transfers: OneOffTransfer[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const amount = Math.min(debtor.remaining, creditor.remaining);
    if (amount > 0.005) {
      transfers.push({
        from_id: debtor.id,
        to_id: creditor.id,
        amount: Math.round(amount * 100) / 100,
      });
    }
    debtor.remaining -= amount;
    creditor.remaining -= amount;
    if (debtor.remaining < 0.005) i++;
    if (creditor.remaining < 0.005) j++;
  }

  return { totalBuyIn, totalCashOut, difference, balanced, transfers };
}

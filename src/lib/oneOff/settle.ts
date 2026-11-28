import { mapTransfers, settle, type SettlementResultOf } from '@/lib/settlement/settle';
import type { OneOffPayment, OneOffTransfer } from './types';

export type OneOffSettlement = SettlementResultOf<OneOffTransfer>;

/** The Settlement module, in a one-off game's shape: snake_case ids in and out. */
export function settleOneOffGame(
  players: { id: string; buy_in: number; cash_out: number }[],
  payments: OneOffPayment[],
): OneOffSettlement {
  const result = settle({
    players: players.map(p => ({ id: p.id, buyIn: p.buy_in, cashOut: p.cash_out })),
    payments: payments.map(p => ({ fromId: p.from_id, toId: p.to_id, amount: p.amount })),
  });
  return mapTransfers(result, t => ({ from_id: t.fromId, to_id: t.toId, amount: t.amount }));
}

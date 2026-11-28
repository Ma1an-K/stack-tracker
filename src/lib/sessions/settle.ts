import { mapTransfers, settle, type SettlementResultOf } from '@/lib/settlement/settle';
import type { SessionPaymentInput, SessionPlayerWithDetails, SessionTransfer } from '@/types/database';

export type SessionSettlement = SettlementResultOf<SessionTransfer>;

/** The Settlement module, in a Session's shape: Player ids in, Player records out. */
export function settleSession(
  sessionPlayers: SessionPlayerWithDetails[],
  payments: SessionPaymentInput[] = [],
): SessionSettlement {
  const result = settle({
    players: sessionPlayers.map(sp => ({ id: sp.player_id, buyIn: Number(sp.buy_in), cashOut: Number(sp.cash_out) })),
    payments: payments.map(p => ({ fromId: p.from_player_id, toId: p.to_player_id, amount: Number(p.amount) })),
  });
  const players = new Map(sessionPlayers.map(sp => [sp.player_id, sp.player]));
  return mapTransfers(result, t => ({ from: players.get(t.fromId)!, to: players.get(t.toId)!, amount: t.amount }));
}

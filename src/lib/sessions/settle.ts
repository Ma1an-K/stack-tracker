import { settle, type Refused, type Settled } from '@/lib/settlement/settle';
import type { SessionPaymentInput, SessionPlayerWithDetails, Settlement } from '@/types/database';

export type SessionSettlement = Refused | (Omit<Settled, 'transfers'> & { transfers: Settlement[] });

/** The Settlement module, in a Session's shape: Player ids in, Player records out. */
export function settleSession(
  sessionPlayers: SessionPlayerWithDetails[],
  payments: SessionPaymentInput[] = [],
): SessionSettlement {
  const result = settle({
    players: sessionPlayers.map(sp => ({ id: sp.player_id, buyIn: Number(sp.buy_in), cashOut: Number(sp.cash_out) })),
    payments: payments.map(p => ({ fromId: p.from_player_id, toId: p.to_player_id, amount: Number(p.amount) })),
  });
  if (result.status === 'refused') return result;
  const players = new Map(sessionPlayers.map(sp => [sp.player_id, sp.player]));
  return {
    ...result,
    transfers: result.transfers.map(t => ({ from: players.get(t.fromId)!, to: players.get(t.toId)!, amount: t.amount })),
  };
}

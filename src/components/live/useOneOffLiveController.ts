import { useOneOffGame } from '@/contexts/OneOffGameContext';
import { toast } from '@/hooks/use-toast';
import type { OneOffAction } from '@/lib/oneOff/reducer';
import type { LiveGameController, RosterPlayer } from './LiveGameController';

/**
 * The one-off game (kept on this device) as a tracker controller. Null while
 * no game is in progress. Every player is in the game, so there is no bench:
 * the roster is the game's players.
 */
export function useOneOffLiveController(): LiveGameController | null {
  const { game, dispatch, seatedCount, totalBuyIn, totalPot } = useOneOffGame();

  if (!game) return null;

  // The reducer's errors are written for people; show them where the tap happened.
  const run = (action: OneOffAction): Promise<{ error: string | null }> => {
    const { error } = dispatch(action);
    if (error) toast({ title: error, variant: 'destructive' });
    return Promise.resolve({ error });
  };

  const roster: RosterPlayer[] = game.players.map(p => ({ id: p.id, name: p.name, is_active: true }));

  return {
    players: game.players.map(p => ({
      player_id: p.id,
      buy_in: p.buy_in,
      ...(p.cash_out === null ? {} : { cash_out: p.cash_out }),
    })),
    payments: game.payments.map(p => ({
      from_player_id: p.from_id,
      to_player_id: p.to_id,
      amount: p.amount,
    })),
    defaultBuyIn: game.default_buy_in,
    startedAt: game.started_at,
    totalPot,
    totalBuyIn,
    seatedCount,
    roster,
    currency: game.currency,
    ownerName: null,
    canCreatePlayer: true,
    // A new name joins the game straight away with nothing in; the tracker
    // then calls addPlayer(id, buyIn), which sets that player's buy-in.
    createPlayer: async (name: string) => {
      const id = crypto.randomUUID();
      const { error } = await run({ type: 'addPlayer', id, name, buyIn: 0 });
      if (error) return { error, player: null };
      return { error: null, player: { id, name: name.trim(), is_active: true } };
    },
    addBuyIn: (id, amount) => run({ type: 'addBuyIn', id, amount }),
    setBuyIn: (id, total) => run({ type: 'setBuyIn', id, total }),
    // Everyone is already in the game (created just before by createPlayer),
    // so "seating" a player is setting their buy-in. dispatch reads the latest
    // game, so this works even from a closure made before the player existed.
    addPlayer: (id, buyIn) => run({ type: 'setBuyIn', id, total: buyIn }),
    removePlayer: id => run({ type: 'removePlayer', id }),
    cashOut: (id, amount) => run({ type: 'cashOut', id, amount }),
    rejoin: id => run({ type: 'rejoin', id }),
    addPayment: p =>
      run({ type: 'addPayment', payment: { from_id: p.from_player_id, to_id: p.to_player_id, amount: p.amount } }),
    removePayment: index => run({ type: 'removePayment', index }),
    endHref: '/one-off/settle',
  };
}

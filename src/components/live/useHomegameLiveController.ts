import { useAuthContext } from '@/contexts/AuthContext';
import { useLiveSession } from '@/contexts/LiveSessionContext';
import { usePlayers } from '@/hooks/usePlayers';
import { useHomegameMembers } from '@/hooks/useHomegameMembers';
import type { LiveGameController } from './LiveGameController';

/**
 * The homegame's live session (stored on the server) as a tracker controller.
 * Null while no game is running, or until the roster has loaded (so names never flash as "Unknown").
 */
export function useHomegameLiveController(): LiveGameController | null {
  const { homegame, isOwner } = useAuthContext();
  const { members } = useHomegameMembers(homegame?.id);
  const { players, loading: playersLoading, addPlayer: createPlayer } = usePlayers(homegame?.id);
  const {
    liveSession,
    totalPot,
    totalBuyIn,
    seatedCount,
    addBuyIn,
    setBuyIn,
    addPlayer,
    removePlayer,
    cashOut,
    rejoin,
    addPayment,
    removePayment,
  } = useLiveSession();

  if (!liveSession || (playersLoading && players.length === 0)) return null;

  return {
    players: liveSession.players,
    payments: liveSession.payments ?? [],
    defaultBuyIn: liveSession.default_buy_in,
    startedAt: liveSession.started_at,
    totalPot,
    totalBuyIn,
    seatedCount,
    roster: players,
    currency: homegame?.currency,
    ownerName: members.find(m => m.role === 'owner')?.profile?.username ?? null,
    canCreatePlayer: isOwner,
    createPlayer,
    addBuyIn,
    setBuyIn,
    addPlayer,
    removePlayer,
    cashOut,
    rejoin,
    addPayment,
    removePayment,
    endHref: '/new-session?from=live',
  };
}

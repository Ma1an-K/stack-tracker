import { useAuthContext } from '@/contexts/AuthContext';
import { useLiveSession } from '@/contexts/LiveSessionContext';
import type { usePlayers } from '@/hooks/usePlayers';
import { useHomegameMembers } from '@/hooks/useHomegameMembers';
import type { LiveGameController } from './LiveGameController';

type PlayersApi = Pick<ReturnType<typeof usePlayers>, 'players' | 'loading' | 'addPlayer'>;

/**
 * The homegame's live session (stored on the server) as a tracker controller.
 * Null while no game is running. The page owns the single `usePlayers` instance and passes it in.
 */
export function useHomegameLiveController(playersApi: PlayersApi): LiveGameController | null {
  const { homegame, isOwner } = useAuthContext();
  const { members } = useHomegameMembers(homegame?.id);
  const { players, addPlayer: createPlayer } = playersApi;
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

  if (!liveSession) return null;

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

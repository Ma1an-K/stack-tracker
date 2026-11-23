import { useAuthContext } from '@/contexts/AuthContext';
import { usePlayers } from '@/hooks/usePlayers';
import { usePlayerClaims } from '@/hooks/usePlayerClaims';
import { useStaleWhileLoading } from '@/hooks/useStaleWhileLoading';
import { PlayerList } from '@/components/players/PlayerList';
import { ClaimRequestsCard } from '@/components/players/ClaimRequestsCard';
import { PageHeader } from '@/components/common/PageHeader';
import { RefreshingDot } from '@/components/common/RefreshingDot';

export function PlayersPage() {
  const { homegame, isOwner, user } = useAuthContext();
  const { players: freshPlayers, loading, addPlayer, updatePlayer, deletePlayer, refetch: refetchPlayers } = usePlayers(homegame?.id);
  const { data: players, isFirstLoad, isRefreshing } = useStaleWhileLoading(
    homegame?.id ? `players:${homegame.id}` : null,
    freshPlayers,
    loading
  );
  const {
    pendingRequests,
    loading: claimsLoading,
    requestClaim,
    approveClaim,
    rejectClaim,
    hasRequestedPlayer,
  } = usePlayerClaims(homegame?.id);

  const handleApproveClaim = async (requestId: string, playerId: string, userId: string) => {
    const result = await approveClaim(requestId, playerId, userId);
    if (!result.error) {
      refetchPlayers();
    }
    return result;
  };

  const handleRequestClaim = async (playerId: string) => {
    const result = await requestClaim(playerId);
    if (!result.error) {
      refetchPlayers();
    }
    return result;
  };

  const hasClaimed = players.some((p) => p.user_id === user?.id);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={homegame?.name}
        title="Players"
        subtitle={
          hasClaimed || isFirstLoad
            ? undefined
            : 'Find your name and tap "This is me" so your results show up in My Stats.'
        }
        action={<RefreshingDot show={isRefreshing} />}
      />

      {isOwner && (
        <ClaimRequestsCard
          requests={pendingRequests}
          loading={claimsLoading}
          onApprove={handleApproveClaim}
          onReject={rejectClaim}
        />
      )}

      <PlayerList
        players={players}
        loading={isFirstLoad}
        isOwner={isOwner}
        currentUserId={user?.id}
        onAddPlayer={addPlayer}
        onUpdatePlayer={updatePlayer}
        onDeletePlayer={deletePlayer}
        onRequestClaim={handleRequestClaim}
        hasRequestedPlayer={hasRequestedPlayer}
      />
    </div>
  );
}

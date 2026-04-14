import { useAuthContext } from '@/contexts/AuthContext';
import { usePlayers } from '@/hooks/usePlayers';
import { usePlayerClaims } from '@/hooks/usePlayerClaims';
import { PlayerList } from '@/components/players/PlayerList';
import { ClaimRequestsCard } from '@/components/players/ClaimRequestsCard';
import { Users } from 'lucide-react';

export function PlayersPage() {
  const { homegame, isOwner, user } = useAuthContext();
  const { players, loading, addPlayer, updatePlayer, deletePlayer, refetch: refetchPlayers } = usePlayers(homegame?.id);
  const { 
    pendingRequests, 
    loading: claimsLoading, 
    requestClaim, 
    approveClaim, 
    rejectClaim,
    hasRequestedPlayer,
    refetch: refetchClaims,
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

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-2">
        <Users className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Players</h1>
      </div>

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
        loading={loading}
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

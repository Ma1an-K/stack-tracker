import { useAuthContext } from '@/contexts/AuthContext';
import { usePlayers } from '@/hooks/usePlayers';
import { useSessions } from '@/hooks/useSessions';
import { Leaderboard } from '@/components/leaderboard/Leaderboard';
import { Loader2 } from 'lucide-react';

export function LeaderboardPage() {
  const { homegame } = useAuthContext();
  const { players, loading: playersLoading } = usePlayers(homegame?.id);
  const { sessions, loading: sessionsLoading } = useSessions(homegame?.id);

  if (playersLoading || sessionsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Leaderboard
        sessions={sessions}
        players={players}
        currency={homegame?.currency || '$'}
      />
    </div>
  );
}

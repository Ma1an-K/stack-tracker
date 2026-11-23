import { useMemo } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { usePlayers } from '@/hooks/usePlayers';
import { useSessions } from '@/hooks/useSessions';
import { useStaleWhileLoading } from '@/hooks/useStaleWhileLoading';
import { Leaderboard } from '@/components/leaderboard/Leaderboard';
import { PageSkeleton } from '@/components/common/PageSkeleton';
import { RefreshingDot } from '@/components/common/RefreshingDot';

export function LeaderboardPage() {
  const { homegame } = useAuthContext();
  const { players, loading: playersLoading } = usePlayers(homegame?.id);
  const { sessions, loading: sessionsLoading } = useSessions(homegame?.id);

  const fresh = useMemo(() => ({ players, sessions }), [players, sessions]);
  const { data, isFirstLoad, isRefreshing } = useStaleWhileLoading(
    homegame?.id ? `standings:${homegame.id}` : null,
    fresh,
    playersLoading || sessionsLoading
  );

  if (isFirstLoad) return <PageSkeleton rows={6} />;

  return (
    <Leaderboard
      sessions={data.sessions}
      players={data.players}
      currency={homegame?.currency || '$'}
      titleAside={<RefreshingDot show={isRefreshing} />}
    />
  );
}

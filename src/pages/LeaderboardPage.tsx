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

  // One guard per input: after a homegame switch each list stays hidden until
  // its own hook has delivered the new homegame's rows, so players from one
  // game are never ranked against sessions from another.
  const id = homegame?.id;
  const p = useStaleWhileLoading(id ? `standings-players:${id}` : null, players, playersLoading);
  const s = useStaleWhileLoading(id ? `standings-sessions:${id}` : null, sessions, sessionsLoading);
  const isFirstLoad = p.isFirstLoad || s.isFirstLoad;
  const isRefreshing = p.isRefreshing || s.isRefreshing;

  if (isFirstLoad) return <PageSkeleton rows={6} />;

  return (
    <Leaderboard
      sessions={s.data}
      players={p.data}
      currency={homegame?.currency || '$'}
      titleAside={<RefreshingDot show={isRefreshing} />}
    />
  );
}

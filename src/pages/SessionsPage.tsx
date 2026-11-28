import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { usePlayers } from '@/hooks/usePlayers';
import { useSessions } from '@/hooks/useSessions';
import { useStaleWhileLoading } from '@/hooks/useStaleWhileLoading';
import { SessionCard } from '@/components/sessions/SessionCard';
import { SessionForm } from '@/components/sessions/SessionForm';
import { LiveSessionCard } from '@/components/sessions/LiveSessionCard';
import { useLiveSession } from '@/contexts/LiveSessionContext';
import { SessionWithPlayers } from '@/types/database';
import { CalendarDays, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/common/PageHeader';
import { PageSkeleton } from '@/components/common/PageSkeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { RefreshingDot } from '@/components/common/RefreshingDot';
import { StartOrJoinCard } from '@/components/home/StartOrJoinCard';

export function SessionsPage() {
  const { homegame } = useAuthContext();
  const location = useLocation();
  const { players } = usePlayers(homegame?.id);
  const { sessions: liveSessions, loading, updateSession, deleteSession, markSettled } = useSessions(homegame?.id);
  const { data: sessions, isFirstLoad, isRefreshing } = useStaleWhileLoading(
    homegame?.id ? `sessions:${homegame.id}` : null,
    liveSessions,
    loading
  );
  const [editingSession, setEditingSession] = useState<SessionWithPlayers | null>(null);
  const { liveSession } = useLiveSession();

  // Arriving straight after logging a session: open the newest one so the
  // settlement is on screen without another tap.
  const navState = location.state as { expandLatest?: boolean; expandSessionId?: string } | null;
  const expandLatest = !!navState?.expandLatest;
  const expandId = navState?.expandSessionId;

  // Deep links reach these tabs before a homegame exists; offer one instead.
  if (!homegame) return <StartOrJoinCard />;
  if (isFirstLoad) return <PageSkeleton rows={5} />;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={homegame?.name}
        title="Sessions"
        subtitle={
          <span className="flex items-center gap-3">
            <span className="tabular-nums">{sessions.length} logged</span>
            <RefreshingDot show={isRefreshing} />
          </span>
        }
      />

      {liveSession && (
        <section className="space-y-2">
          <h2 className="section-header px-1">In progress</h2>
          <LiveSessionCard />
        </section>
      )}

      {sessions.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No sessions yet"
          description="Start a live game to track buy-ins as you play, or log a game that's already finished."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild>
                <Link to="/live-session">Start live game</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link to="/new-session">
                  <Plus /> Log a result
                </Link>
              </Button>
            </div>
          }
        />
      ) : (
        <div className="space-y-3">
          {sessions.map((session, i) => (
            <SessionCard
              key={session.id}
              session={session}
              currency={homegame?.currency || '$'}
              homegameName={homegame?.name}
              defaultExpanded={expandLatest && (expandId ? session.id === expandId : i === 0)}
              onEdit={() => setEditingSession(session)}
              onDelete={() => deleteSession(session.id)}
              onMarkSettled={(settled) => markSettled(session.id, settled)}
              actionsDisabled={isRefreshing}
            />
          ))}
        </div>
      )}

      <Dialog open={!!editingSession} onOpenChange={() => setEditingSession(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit session</DialogTitle>
          </DialogHeader>
          {editingSession && (
            <SessionForm
              players={players}
              currency={homegame?.currency || '$'}
              existingSession={editingSession}
              onSubmit={(date, playerData, notes, payments) =>
                updateSession(editingSession.id, date, playerData, notes, payments)
              }
              onCancel={() => setEditingSession(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { usePlayers } from '@/hooks/usePlayers';
import { useSessions } from '@/hooks/useSessions';
import { SessionCard } from '@/components/sessions/SessionCard';
import { SessionForm } from '@/components/sessions/SessionForm';
import { LiveSessionCard } from '@/components/sessions/LiveSessionCard';
import { useLiveSession } from '@/contexts/LiveSessionContext';
import { SessionWithPlayers } from '@/types/database';
import { Loader2, Calendar } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function SessionsPage() {
  const { homegame } = useAuthContext();
  const { players } = usePlayers(homegame?.id);
  const { sessions, loading, updateSession, deleteSession, markSettled } = useSessions(homegame?.id);
  const [editingSession, setEditingSession] = useState<SessionWithPlayers | null>(null);
  const { liveSession } = useLiveSession();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-3xl mx-auto animate-fade-in">
      <div className="flex items-center gap-2">
        <Calendar className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-lg font-semibold">Sessions</h1>
        <span className="text-sm text-muted-foreground ml-auto tabular-nums">{sessions.length} total</span>
      </div>

      {liveSession && (
        <div className="space-y-2">
          <span className="section-header">In Progress</span>
          <LiveSessionCard />
        </div>
      )}

      {sessions.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="h-8 w-8 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No sessions yet.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Create your first session using the "New Session" tab.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              currency={homegame?.currency || '$'}
              homegameName={homegame?.name}
              onEdit={() => setEditingSession(session)}
              onDelete={() => deleteSession(session.id)}
              onMarkSettled={(settled) => markSettled(session.id, settled)}
            />
          ))}
        </div>
      )}

      <Dialog open={!!editingSession} onOpenChange={() => setEditingSession(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Session</DialogTitle>
          </DialogHeader>
          {editingSession && (
            <SessionForm
              players={players}
              existingSession={editingSession}
              onSubmit={(date, playerData, notes) =>
                updateSession(editingSession.id, date, playerData, notes)
              }
              onCancel={() => setEditingSession(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { useLiveSession } from '@/contexts/LiveSessionContext';
import { usePlayers } from '@/hooks/usePlayers';
import { useSessions } from '@/hooks/useSessions';
import { SessionForm } from '@/components/sessions/SessionForm';
import { LiveSessionCard } from '@/components/sessions/LiveSessionCard';
import { PlusCircle, AlertCircle, Radio, ChevronRight, Flag } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function NewSessionPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { homegame, isOwner } = useAuthContext();
  const { liveSession, finish } = useLiveSession();
  const { activePlayers, loading: playersLoading, addPlayer } = usePlayers(homegame?.id);
  const { createSession } = useSessions(homegame?.id, homegame?.name);

  // Arriving from "End Session & Cash Out": pre-seed the normal form with the
  // live buy-ins and close the draft once the real session is logged.
  const fromLive = searchParams.get('from') === 'live' && !!liveSession;

  const handleSubmit = async (
    date: string,
    players: { player_id: string; buy_in: number; cash_out: number }[],
    notes?: string
  ) => {
    const result = await createSession(date, players, notes);
    if (!result.error) {
      if (fromLive) await finish();
      navigate('/');
    }
    return result;
  };

  if (activePlayers.length < 2 && !playersLoading) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="flex items-center gap-2">
          <PlusCircle className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">New Session</h1>
        </div>

        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              You need at least 2 active players to create a session.
            </p>
            {isOwner ? (
              <Button asChild>
                <Link to="/players">Add Players</Link>
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                Ask the homegame owner to add players.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-2">
        {fromLive ? <Flag className="h-6 w-6 text-primary" /> : <PlusCircle className="h-6 w-6 text-primary" />}
        <h1 className="text-2xl font-bold">{fromLive ? 'Cash Out' : 'New Session'}</h1>
      </div>

      {fromLive ? (
        <p className="text-sm text-muted-foreground -mt-2">
          Buy-ins are carried over from the live session. Enter everyone's cash-out, then log it.
        </p>
      ) : liveSession ? (
        <LiveSessionCard />
      ) : (
        <Link
          to="/live-session"
          className="flex items-center gap-3 rounded-lg border border-dashed border-gold/40 bg-gold/5 p-3 transition-colors hover:bg-gold/10"
        >
          <Radio className="h-5 w-5 shrink-0 text-gold" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Playing right now?</p>
            <p className="text-xs text-muted-foreground">Track buy-ins live as the game runs, cash out at the end.</p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Link>
      )}

      <SessionForm
        key={fromLive ? liveSession?.id : 'blank'}
        players={activePlayers}
        onSubmit={handleSubmit}
        onAddPlayer={isOwner ? addPlayer : undefined}
        initialPlayers={fromLive ? liveSession?.players : undefined}
        initialNotes={fromLive ? liveSession?.notes ?? undefined : undefined}
      />
    </div>
  );
}

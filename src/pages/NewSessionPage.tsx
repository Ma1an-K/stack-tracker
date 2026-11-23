import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { useLiveSession } from '@/contexts/LiveSessionContext';
import { usePlayers } from '@/hooks/usePlayers';
import { useSessions } from '@/hooks/useSessions';
import { SessionPaymentInput } from '@/types/database';
import { SessionForm } from '@/components/sessions/SessionForm';
import { LiveSessionCard } from '@/components/sessions/LiveSessionCard';
import { Radio, NotebookPen, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/common/PageHeader';
import { PageSkeleton } from '@/components/common/PageSkeleton';
import { EmptyState } from '@/components/common/EmptyState';

export function NewSessionPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { homegame, isOwner } = useAuthContext();
  const { liveSession, finish } = useLiveSession();
  const { activePlayers, loading: playersLoading, addPlayer } = usePlayers(homegame?.id);
  const { createSession } = useSessions(homegame?.id, homegame?.name);
  const currency = homegame?.currency || '$';

  // Arriving from "End Session & Cash Out": pre-seed the normal form with the
  // live buy-ins and close the draft once the real session is logged.
  const fromLive = searchParams.get('from') === 'live' && !!liveSession;

  const handleSubmit = async (
    date: string,
    players: { player_id: string; buy_in: number; cash_out: number }[],
    notes: string | undefined,
    payments: SessionPaymentInput[]
  ) => {
    const result = await createSession(date, players, notes, payments);
    if (!result.error) {
      if (fromLive) await finish();
      // Land on the result: Sessions opens the newest card with its settlement.
      const newId = (result as { session?: { id?: string } }).session?.id;
      navigate('/sessions', { state: { expandLatest: true, expandSessionId: newId } });
    }
    return result;
  };

  // Players load before the form renders, so chips don't pop in.
  if (playersLoading && activePlayers.length === 0) return <PageSkeleton rows={3} />;

  if (activePlayers.length < 2) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow={homegame?.name} title="New session" />
        <EmptyState
          icon={Users}
          title="Seat at least two players"
          description="A session needs two or more active players in this homegame."
          action={
            isOwner ? (
              <Button asChild>
                <Link to="/players">Add players</Link>
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">Ask the homegame owner to add players.</p>
            )
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={homegame?.name}
        title={fromLive ? 'Cash out' : 'New session'}
        subtitle={
          fromLive
            ? 'Buy-ins, early cash-outs and payments are carried over. Enter the remaining cash-outs, then log it.'
            : undefined
        }
      />

      {!fromLive &&
        (liveSession ? (
          <LiveSessionCard />
        ) : (
          <div role="tablist" aria-label="Session type" className="grid grid-cols-2 gap-1 rounded-xl border border-border/60 bg-muted p-1">
            <Link
              to="/live-session"
              role="tab"
              aria-selected="false"
              className="pressable flex min-h-[52px] items-center justify-center gap-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Radio className="h-4 w-4 text-gold" aria-hidden="true" />
              <span className="text-left leading-tight">
                Live game
                <span className="block text-[0.6875rem] font-normal">Playing now</span>
              </span>
            </Link>
            <span
              role="tab"
              aria-selected="true"
              className="flex min-h-[52px] items-center justify-center gap-2 rounded-lg bg-secondary text-sm font-semibold text-gold shadow-[inset_0_1px_0_hsl(40_70%_75%/0.08),0_2px_8px_-4px_hsl(0_0%_0%/0.8)]"
            >
              <NotebookPen className="h-4 w-4" aria-hidden="true" />
              <span className="text-left leading-tight">
                Log result
                <span className="block text-[0.6875rem] font-normal text-muted-foreground">Game finished</span>
              </span>
            </span>
          </div>
        ))}

      <SessionForm
        key={fromLive ? liveSession?.id : 'blank'}
        players={activePlayers}
        currency={currency}
        onSubmit={handleSubmit}
        onAddPlayer={isOwner ? addPlayer : undefined}
        initialPlayers={fromLive ? liveSession?.players : undefined}
        initialPayments={fromLive ? liveSession?.payments ?? [] : undefined}
        initialNotes={fromLive ? liveSession?.notes ?? undefined : undefined}
      />
    </div>
  );
}

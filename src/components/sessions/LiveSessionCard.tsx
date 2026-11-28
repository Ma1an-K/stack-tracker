import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useLiveSession } from '@/contexts/LiveSessionContext';
import { useAuthContext } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/settlement/format';
import { LivePulse } from './LivePulse';

/** Resume card for the dashboard and sessions list. Renders nothing when no game is live. */
export function LiveSessionCard() {
  const { liveSession, totalBuyIn, seatedCount } = useLiveSession();
  const { homegame } = useAuthContext();

  if (!liveSession) return null;

  return (
    <Link
      to="/live-session"
      className="pressable relative block overflow-hidden rounded-xl border border-gold/45 bg-[linear-gradient(135deg,hsl(var(--gold)/0.14),hsl(var(--card))_55%)] p-4 shadow-[0_0_32px_-12px_hsl(var(--gold)/0.6)] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <LivePulse />
            <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-gold">Live now</span>
          </div>
          <p className="mt-1.5 truncate text-[0.9375rem] font-semibold">{homegame?.name}</p>
          <p className="text-xs text-muted-foreground">
            Started {format(parseISO(liveSession.started_at), 'h:mm a')} · {seatedCount} of {liveSession.players.length} seated
          </p>
        </div>
        <div className="shrink-0 text-right">
          <div className="font-display text-[2rem] font-semibold leading-none tabular-nums text-gold">
            {formatCurrency(totalBuyIn, homegame?.currency)}
          </div>
          <div className="mt-1 text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">bought in</div>
        </div>
      </div>
      <div className="mt-4 flex h-11 items-center justify-center gap-2 rounded-lg bg-gold/15 text-sm font-semibold text-gold">
        Back to the table
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </div>
    </Link>
  );
}

import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLiveSession } from '@/contexts/LiveSessionContext';
import { useAuthContext } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/settlement';
import { LivePulse } from './LivePulse';

/** Resume card for the dashboard and sessions list. Renders nothing when no game is live. */
export function LiveSessionCard() {
  const { liveSession, totalPot } = useLiveSession();
  const { homegame } = useAuthContext();

  if (!liveSession) return null;

  return (
    <Card className="border-gold/50 bg-gold/5">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <LivePulse />
              <span className="text-xs font-semibold uppercase tracking-wider text-gold">Live now</span>
            </div>
            <p className="mt-1.5 truncate font-semibold">{homegame?.name}</p>
            <p className="text-xs text-muted-foreground">
              Started {format(parseISO(liveSession.started_at), 'h:mm a')} · {liveSession.players.length} players
            </p>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-xl font-bold tabular-nums text-gold">
              {formatCurrency(totalPot, homegame?.currency)}
            </div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">on the table</div>
          </div>
        </div>
        <Button asChild className="mt-3 h-10 w-full">
          <Link to="/live-session">
            Resume Session
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

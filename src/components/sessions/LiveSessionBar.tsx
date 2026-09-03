import { Link, useLocation } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useLiveSession } from '@/contexts/LiveSessionContext';
import { useAuthContext } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/settlement';
import { LivePulse } from './LivePulse';

/** Thin resume strip pinned to the top of every page while a game is running. */
export function LiveSessionBar() {
  const { liveSession, totalPot } = useLiveSession();
  const { homegame } = useAuthContext();
  const { pathname } = useLocation();

  if (!liveSession || pathname === '/live-session') return null;

  return (
    <Link
      to="/live-session"
      className="sticky top-0 z-20 -mx-[max(1rem,env(safe-area-inset-left))] -mt-4 mb-4 flex items-center gap-2.5 border-b border-gold/30 bg-gold/10 px-4 py-2.5 backdrop-blur transition-colors hover:bg-gold/15 md:-mx-6 md:-mt-6 md:mb-6 md:px-6"
    >
      <LivePulse />
      <span className="min-w-0 flex-1 truncate text-xs">
        <span className="font-semibold text-gold">Session in progress</span>
        <span className="text-muted-foreground">
          {' '}· {liveSession.players.length} players · {formatCurrency(totalPot, homegame?.currency)} in
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-0.5 text-xs font-medium text-gold">
        Resume
        <ArrowRight className="h-3 w-3" />
      </span>
    </Link>
  );
}

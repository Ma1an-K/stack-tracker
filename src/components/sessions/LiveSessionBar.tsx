import { Link, useLocation } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useLiveSession } from '@/contexts/LiveSessionContext';
import { useAuthContext } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/settlement/format';
import { LivePulse } from './LivePulse';

/** Resume strip pinned to the top of every page while a game is running. */
export function LiveSessionBar() {
  const { liveSession, totalBuyIn } = useLiveSession();
  const { homegame } = useAuthContext();
  const { pathname } = useLocation();

  if (!liveSession || pathname === '/live-session') return null;

  return (
    <Link
      to="/live-session"
      className="pressable sticky top-2 z-20 mx-auto mb-4 flex min-h-[48px] max-w-3xl items-center gap-3 rounded-2xl border border-gold/35 bg-[hsl(var(--card)/0.85)] px-4 py-2.5 shadow-[0_10px_30px_-14px_hsl(0_0%_0%/0.9),0_0_24px_-10px_hsl(var(--gold)/0.5)] backdrop-blur-xl hover:border-gold/55"
    >
      <LivePulse />
      <span className="min-w-0 flex-1 truncate text-[0.8125rem]">
        <span className="font-semibold text-gold">Game in progress</span>
        <span className="text-muted-foreground">
          {' '}· {liveSession.players.length} players · <span className="tabular-nums">{formatCurrency(totalBuyIn, homegame?.currency)}</span> in
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-1 text-[0.8125rem] font-semibold text-gold">
        Resume
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </span>
    </Link>
  );
}

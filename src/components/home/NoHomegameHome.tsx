import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, ClipboardList, Play, Radio } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import { useOneOffGame } from '@/contexts/OneOffGameContext';
import { useSavedOneOffGames } from '@/hooks/useSavedOneOffGames';
import { greeting } from '@/lib/greeting';
import { cn } from '@/lib/utils';
import { StartGameDialog } from '@/components/oneoff/StartGameDialog';
import { SavedGamesList } from '@/components/oneoff/SavedGamesList';
import { playerCount } from '@/lib/oneOff/format';
import { StartOrJoinCard } from './StartOrJoinCard';

/** Home for a signed-in user who isn't in any homegame yet: quick games first, then start or join one. */
export function NoHomegameHome() {
  const { profile } = useAuthContext();
  const { game } = useOneOffGame();
  const { games, loading } = useSavedOneOffGames();
  const [startMode, setStartMode] = useState<'live' | 'totals' | null>(null);

  return (
    <div className="space-y-6">
      <header className="min-w-0">
        <p className="section-header mb-1">{greeting()}</p>
        <h1 className="page-title truncate">{profile?.display_name || profile?.username || 'Welcome'}</h1>
      </header>

      {game && (
        <Link
          to={game.mode === 'live' ? '/one-off/live' : '/one-off/settle'}
          className="pressable flex min-h-[64px] items-center gap-3 rounded-xl border border-gold/45 bg-gold/[0.07] px-4 py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Play className="h-5 w-5 shrink-0 text-gold" aria-hidden="true" />
          <span className="min-w-0 flex-1 text-sm">
            <span className="block font-semibold">Resume {game.label.trim() || 'one-off game'}</span>
            <span className="block text-xs text-muted-foreground">
              {`${game.mode === 'live' ? 'Live' : 'Final totals'} · ${playerCount(game.players.length)}`}
            </span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-gold" aria-hidden="true" />
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3">
        <QuickAction
          primary
          icon={Radio}
          title="Start live game"
          hint="Track buy-ins as you play"
          disabled={!!game}
          onClick={() => setStartMode('live')}
        />
        <QuickAction
          icon={ClipboardList}
          title="Enter final totals"
          hint="Game already finished"
          disabled={!!game}
          onClick={() => setStartMode('totals')}
        />
      </div>

      <StartOrJoinCard />

      <section className="space-y-2" aria-labelledby="saved-games-title">
        <h2 id="saved-games-title" className="section-header px-1">
          Saved games
        </h2>
        <SavedGamesList games={games} loading={loading} />
      </section>

      <StartGameDialog mode={startMode} onOpenChange={o => { if (!o) setStartMode(null); }} />
    </div>
  );
}

interface QuickActionProps {
  icon: typeof Radio;
  title: string;
  hint: string;
  primary?: boolean;
  disabled: boolean;
  onClick: () => void;
}

function QuickAction({ icon: Icon, title, hint, primary, disabled, onClick }: QuickActionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'pressable flex min-h-[88px] flex-col justify-between rounded-xl p-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
        primary
          ? 'gold-fill text-primary-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background'
          : 'surface hover:border-gold/30'
      )}
    >
      <Icon className={cn('h-5 w-5', !primary && 'text-gold')} aria-hidden="true" />
      <span>
        <span className="block text-[0.9375rem] font-semibold leading-tight">{title}</span>
        <span className={cn('text-xs', primary ? 'opacity-75' : 'text-muted-foreground')}>{hint}</span>
      </span>
    </button>
  );
}

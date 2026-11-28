import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ClipboardList, Play, Radio, Trash2, TriangleAlert } from 'lucide-react';
import { useOneOffGame } from '@/contexts/OneOffGameContext';
import { useSavedOneOffGames } from '@/hooks/useSavedOneOffGames';
import { formatCurrency } from '@/lib/settlement';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { StartGameDialog } from '@/components/oneoff/StartGameDialog';
import { SavedGamesList } from '@/components/oneoff/SavedGamesList';
import { playerCount } from '@/lib/oneOff/format';

function DiscardGameButton() {
  const { discard } = useOneOffGame();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" className="text-muted-foreground hover:text-destructive">
          <Trash2 />
          Discard
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Discard this game?</AlertDialogTitle>
          <AlertDialogDescription>
            Everything tracked so far will be thrown away. Nothing is saved to your history.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep game</AlertDialogCancel>
          <AlertDialogAction
            onClick={discard}
            className="bg-destructive bg-none text-destructive-foreground shadow-none hover:bg-destructive/90"
          >
            Discard
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function OneOffHubPage() {
  const navigate = useNavigate();
  const { game, storageOk, totalBuyIn } = useOneOffGame();
  const { games, loading } = useSavedOneOffGames();
  const [startMode, setStartMode] = useState<'live' | 'totals' | null>(null);

  // Back must never leave the app on a deep link or cold PWA start.
  const goBack = () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate('/');
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="-ml-3 shrink-0" onClick={goBack} aria-label="Back">
          <ArrowLeft className="!size-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <p className="section-header">No homegame needed</p>
          <h1 className="page-title truncate">One-off games</h1>
        </div>
      </header>

      {game && (
        <section className="relative overflow-hidden rounded-xl border border-gold/45 bg-[linear-gradient(135deg,hsl(var(--gold)/0.14),hsl(var(--card))_55%)] p-4 shadow-[0_0_32px_-12px_hsl(var(--gold)/0.55)]">
          <p className="section-header">In progress</p>
          <h2 className="mt-1 truncate font-display text-2xl font-semibold">{game.label.trim() || 'One-off game'}</h2>
          <p className="mt-1 text-[0.8125rem] text-muted-foreground tabular-nums">
            {`${game.mode === 'live' ? 'Live' : 'Final totals'} · ${playerCount(game.players.length)}`}
            {game.mode === 'live' && ` · ${formatCurrency(totalBuyIn, game.currency)} in`}
          </p>
          {!storageOk && (
            <p className="mt-3 flex items-start gap-1.5 text-xs text-warning">
              <TriangleAlert className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              This game is only kept until you close or refresh this page.
            </p>
          )}
          <div className="mt-4 flex items-center gap-2">
            <Button asChild className="flex-1">
              <Link to={game.mode === 'live' ? '/one-off/live' : '/one-off/settle'}>
                <Play />
                Resume
              </Link>
            </Button>
            <DiscardGameButton />
          </div>
        </section>
      )}

      <section className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Button size="lg" className="h-14" disabled={!!game} onClick={() => setStartMode('live')}>
          <Radio />
          Start live game
        </Button>
        <Button size="lg" variant="secondary" className="h-14" disabled={!!game} onClick={() => setStartMode('totals')}>
          <ClipboardList />
          Enter final totals
        </Button>
        {game && (
          <p className="text-xs text-muted-foreground sm:col-span-2">Finish or discard the game in progress to start another.</p>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="section-header px-1">Saved games</h2>
        <SavedGamesList games={games} loading={loading} />
      </section>

      <StartGameDialog mode={startMode} onOpenChange={o => { if (!o) setStartMode(null); }} />
    </div>
  );
}

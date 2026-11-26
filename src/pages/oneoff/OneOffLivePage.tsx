import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowLeft, Spade, TriangleAlert } from 'lucide-react';
import { useOneOffGame } from '@/contexts/OneOffGameContext';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/common/EmptyState';
import { TrackerView } from '@/components/live/TrackerView';
import { useOneOffLiveController } from '@/components/live/useOneOffLiveController';

export function OneOffLivePage() {
  const navigate = useNavigate();
  const { game, storageOk } = useOneOffGame();
  const controller = useOneOffLiveController();

  // Back must never leave the app on a deep link or cold PWA start.
  const goBack = () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate('/one-off');
  };

  // A final-totals game has no live tracker; it is entered on the settle screen.
  if (game?.mode === 'totals') return <Navigate to="/one-off/settle" replace />;

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="-ml-3 shrink-0" onClick={goBack} aria-label="Back">
          <ArrowLeft className="!size-5" />
        </Button>
        <div className="min-w-0 flex-1">
          {game?.label.trim() && <p className="section-header truncate">{game.label.trim()}</p>}
          <h1 className="page-title truncate">One-off game</h1>
        </div>
      </header>

      {!storageOk && (
        <p className="flex items-start gap-1.5 px-1 text-xs text-warning">
          <TriangleAlert className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          This game is only kept until you close or refresh this page.
        </p>
      )}

      {controller ? (
        <TrackerView controller={controller} />
      ) : (
        <EmptyState
          icon={Spade}
          title="No game in progress"
          description="Start a live one-off game to track buy-ins here."
          action={
            <Button asChild>
              <Link to="/one-off">Go to one-off games</Link>
            </Button>
          }
        />
      )}
    </div>
  );
}

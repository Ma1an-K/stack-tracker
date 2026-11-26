import { useNavigate, Link } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { useLiveSession } from '@/contexts/LiveSessionContext';
import { usePlayers } from '@/hooks/usePlayers';
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
import { Trash2, Users, ArrowLeft } from 'lucide-react';
import { PageSkeleton } from '@/components/common/PageSkeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { SetupView } from '@/components/live/SetupView';
import { TrackerView } from '@/components/live/TrackerView';
import { useHomegameLiveController } from '@/components/live/useHomegameLiveController';

/* ------------------------------------------------------------------ */

function DiscardButton() {
  const navigate = useNavigate();
  const { finish } = useLiveSession();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
          <Trash2 />
          Discard
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Discard live session?</AlertDialogTitle>
          <AlertDialogDescription>
            All buy-ins tracked so far will be thrown away. Nothing is logged to your history.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep playing</AlertDialogCancel>
          <AlertDialogAction
            onClick={async () => {
              const { error } = await finish();
              if (!error) navigate('/');
            }}
            className="bg-destructive bg-none text-destructive-foreground shadow-none hover:bg-destructive/90"
          >
            Discard
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function LiveSessionPage() {
  const navigate = useNavigate();
  const { homegame } = useAuthContext();
  const { liveSession, loading, start } = useLiveSession();
  const playersApi = usePlayers(homegame?.id);
  const { players, activePlayers, loading: playersLoading } = playersApi;
  const controller = useHomegameLiveController(playersApi);

  // Back must never leave the app on a deep link or cold PWA start.
  const goBack = () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate('/');
  };

  if ((loading && !liveSession) || (playersLoading && players.length === 0)) return <PageSkeleton rows={4} hero />;

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="-ml-3 shrink-0" onClick={goBack} aria-label="Back">
          <ArrowLeft className="!size-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <p className="section-header">{homegame?.name}</p>
          <h1 className="page-title truncate">{liveSession ? 'Live game' : 'Start a live game'}</h1>
        </div>
        {liveSession && <DiscardButton />}
      </header>

      {controller ? (
        <TrackerView controller={controller} />
      ) : activePlayers.length < 2 ? (
        <EmptyState
          icon={Users}
          title="Seat at least two players"
          description="A live game needs two or more active players in this homegame."
          action={
            <Button asChild>
              <Link to="/players">Go to Players</Link>
            </Button>
          }
        />
      ) : (
        <SetupView players={activePlayers} onStart={start} />
      )}
    </div>
  );
}

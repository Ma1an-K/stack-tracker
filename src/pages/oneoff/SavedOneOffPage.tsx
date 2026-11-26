import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ArrowLeft, ArrowRight, SearchX, Share2, Trash2 } from 'lucide-react';
import { useOneOffHistory } from '@/hooks/useOneOffHistory';
import { toast } from '@/hooks/use-toast';
import { formatCurrency, formatProfit } from '@/lib/settlement';
import { cn } from '@/lib/utils';
import type { SavedOneOffGame } from '@/lib/oneOff/types';
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
import { EmptyState } from '@/components/common/EmptyState';
import { PageSkeleton } from '@/components/common/PageSkeleton';
import { buildOneOffShareText, shareText } from '@/components/oneoff/share';

export function SavedOneOffPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { get, remove } = useOneOffHistory();
  const [saved, setSaved] = useState<SavedOneOffGame | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    if (!id) {
      setSaved(null);
      setLoading(false);
      return;
    }
    void get(id).then(row => {
      if (cancelled) return;
      setSaved(row);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [id, get]);

  // Back must never leave the app on a deep link or cold PWA start.
  const goBack = () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate('/one-off');
  };

  if (loading) return <PageSkeleton rows={4} />;

  const title = saved?.label?.trim() || 'One-off game';
  const header = (
    <header className="flex items-center gap-2">
      <Button variant="ghost" size="icon" className="-ml-3 shrink-0" onClick={goBack} aria-label="Back">
        <ArrowLeft className="!size-5" />
      </Button>
      <div className="min-w-0 flex-1">
        <p className="section-header">{saved ? format(parseISO(saved.played_on), 'EEEE, MMM d, yyyy') : 'Saved game'}</p>
        <h1 className="page-title truncate">{title}</h1>
      </div>
    </header>
  );

  if (!saved) {
    return (
      <div className="space-y-6">
        {header}
        <EmptyState
          icon={SearchX}
          title="Game not found"
          description="It may have been deleted."
          action={
            <Button asChild>
              <Link to="/one-off">Go to one-off games</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const { currency } = saved;
  const nameOf = (pid: string) => saved.players.find(p => p.id === pid)?.name ?? 'Unknown';
  // The transfers are shown exactly as stored at save time, never recomputed.
  const handleShare = () =>
    shareText(
      buildOneOffShareText({
        label: saved.label,
        played_on: saved.played_on,
        currency,
        players: saved.players,
        payments: saved.payments,
        transfers: saved.transfers,
      })
    );

  const handleDelete = async () => {
    const { error } = await remove(saved.id);
    if (error) {
      toast({ title: error, variant: 'destructive' });
      return;
    }
    navigate('/one-off');
  };

  return (
    <div className="space-y-4">
      {header}

      <section className="surface space-y-2 p-3 sm:p-4">
        <div className="grid grid-cols-[1fr_auto_auto_auto] items-end gap-x-3 px-1 pb-1 text-[0.6875rem] uppercase tracking-[0.1em] text-muted-foreground">
          <h2 className="section-header">Players</h2>
          <span className="w-16 text-right">Buy-in</span>
          <span className="w-16 text-right">Cash-out</span>
          <span className="w-20 text-right">Profit</span>
        </div>
        {saved.players.map(p => {
          const profit = p.cash_out - p.buy_in;
          return (
            <div
              key={p.id}
              className="grid min-h-[48px] grid-cols-[1fr_auto_auto_auto] items-center gap-x-3 rounded-xl bg-muted/40 px-3 text-sm tabular-nums"
            >
              <span className="truncate font-medium">{p.name}</span>
              <span className="w-16 text-right text-muted-foreground">{formatCurrency(p.buy_in, currency)}</span>
              <span className="w-16 text-right">{formatCurrency(p.cash_out, currency)}</span>
              <span className={cn('w-20 text-right font-semibold', profit > 0.005 ? 'profit' : profit < -0.005 ? 'loss' : 'text-muted-foreground')}>
                {formatProfit(profit, currency)}
              </span>
            </div>
          );
        })}
      </section>

      {saved.payments.length > 0 && (
        <section className="surface space-y-2 p-3 sm:p-4">
          <h2 className="section-header px-1 pb-1">Paid during the game</h2>
          {saved.payments.map((p, i) => (
            <div key={i} className="flex min-h-[48px] items-center gap-2 rounded-xl bg-muted/40 px-3 text-sm">
              <span className="font-medium">{nameOf(p.from_id)}</span>
              <ArrowRight className="h-3.5 w-3.5 text-gold" aria-hidden="true" />
              <span className="font-medium">{nameOf(p.to_id)}</span>
              <span className="ml-auto font-semibold tabular-nums text-gold">{formatCurrency(p.amount, currency)}</span>
            </div>
          ))}
        </section>
      )}

      <section className="surface space-y-2 p-3 sm:p-4">
        <h2 className="section-header px-1 pb-1">Who pays whom</h2>
        {saved.transfers.length === 0 ? (
          <p className="px-1 text-sm text-muted-foreground">Nobody owes anything.</p>
        ) : (
          saved.transfers.map((t, i) => (
            <div key={i} className="flex min-h-[48px] items-center gap-2 rounded-xl bg-muted/40 px-3 text-sm">
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-gold" aria-hidden="true" />
              <span>{`${nameOf(t.from_id)} pays ${nameOf(t.to_id)} ${formatCurrency(t.amount, currency)}`}</span>
            </div>
          ))
        )}
      </section>

      {saved.notes?.trim() && (
        <section className="surface space-y-1.5 p-3 sm:p-4">
          <h2 className="section-header px-1">Notes</h2>
          <p className="whitespace-pre-wrap px-1 text-sm">{saved.notes}</p>
        </section>
      )}

      <p className="px-1 text-xs text-muted-foreground">{`Currency: ${currency}`}</p>

      <div className="flex gap-2">
        <Button variant="secondary" size="lg" className="flex-1" onClick={handleShare}>
          <Share2 />
          Share
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="lg" className="text-muted-foreground hover:text-destructive">
              <Trash2 />
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this game?</AlertDialogTitle>
              <AlertDialogDescription>It will be removed from your history. This can't be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep game</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive bg-none text-destructive-foreground shadow-none hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

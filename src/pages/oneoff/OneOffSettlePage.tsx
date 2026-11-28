import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Loader2, Save, Share2, Spade, TriangleAlert } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import { useOneOffGame } from '@/contexts/OneOffGameContext';
import { useOneOffHistory } from '@/hooks/useOneOffHistory';
import { useInstallNudge } from '@/contexts/InstallNudgeContext';
import { toast } from '@/hooks/use-toast';
import { settleOneOffGame } from '@/lib/oneOff/settle';
import { formatCurrency } from '@/lib/settlement/format';
import { describeRefusal, summaryOf, transfersOf } from '@/lib/settlement/settle';
import type { OneOffAction } from '@/lib/oneOff/reducer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { SettlePlayers } from '@/components/oneoff/SettlePlayers';
import { SettlePayments } from '@/components/oneoff/SettlePayments';
import { buildOneOffShareText, shareText } from '@/components/oneoff/share';

export function OneOffSettlePage() {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const { game, storageOk, dispatch, discard } = useOneOffGame();
  const { games: savedGames, loading: savedLoading, save } = useOneOffHistory();
  const { firstSuccess } = useInstallNudge();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // The currency typed so far; committed on blur so a one-character symbol can be replaced.
  const [currencyDraft, setCurrencyDraft] = useState<string | null>(null);

  // Back must never leave the app on a deep link or cold PWA start.
  const goBack = () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate('/one-off');
  };

  const header = (
    <header className="flex items-center gap-2">
      <Button variant="ghost" size="icon" className="-ml-3 shrink-0" onClick={goBack} aria-label="Back">
        <ArrowLeft className="!size-5" />
      </Button>
      <div className="min-w-0 flex-1">
        <p className="section-header truncate">{game?.label.trim() || 'One-off game'}</p>
        <h1 className="page-title truncate">Settle up</h1>
      </div>
    </header>
  );

  if (!game) {
    return (
      <div className="space-y-6">
        {header}
        <EmptyState
          icon={Spade}
          title="No game in progress"
          description="Start a one-off game or enter final totals to settle up."
          action={
            <Button asChild>
              <Link to="/one-off">Go to one-off games</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const run = (action: OneOffAction) => {
    const result = dispatch(action);
    if (result.error) toast({ title: result.error, variant: 'destructive' });
    setSaveError(null);
    return result;
  };

  const { currency } = game;
  const missing = game.players.filter(p => p.cash_out === null);
  // A missing cash-out counts as 0 until it is entered.
  const settlement = settleOneOffGame(
    game.players.map(p => ({ id: p.id, buy_in: p.buy_in, cash_out: p.cash_out ?? 0 })),
    game.payments
  );
  const transfers = transfersOf(settlement);
  const ready = settlement.status === 'settled' && missing.length === 0;
  const nameOf = (id: string) => game.players.find(p => p.id === id)?.name ?? 'Unknown';

  const handleShare = () =>
    shareText(
      buildOneOffShareText({
        label: game.label,
        played_on: game.played_on,
        currency,
        players: game.players,
        payments: game.payments,
        transfers,
      })
    );

  const handleSave = async () => {
    if (!user || saving) return;
    setSaving(true);
    setSaveError(null);
    // No saved games yet means this is the account's first.
    const isFirstSave = !savedLoading && savedGames.length === 0;
    // Every control is locked while saving, so nothing typed now is lost by the discard below.
    const { id, error } = await save(game, user.id);
    setSaving(false);
    if (error || !id) {
      setSaveError(error ?? "Couldn't save. Check your connection and try again.");
      return;
    }
    discard();
    navigate(`/one-off/saved/${id}`);
    firstSuccess('oneoff', isFirstSave);
  };

  return (
    <div className="space-y-4">
      {header}

      {!storageOk && (
        <p className="flex items-start gap-1.5 px-1 text-xs text-warning">
          <TriangleAlert className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          This game is only kept until you close or refresh this page.
        </p>
      )}

      <section className="surface grid grid-cols-2 gap-3 p-3 sm:p-4">
        <div className="col-span-2 space-y-1.5">
          <Label htmlFor="oneoff-label">Label</Label>
          <Input
            id="oneoff-label"
            placeholder="Dan's place"
            maxLength={80}
            disabled={saving}
            value={game.label}
            onChange={e => run({ type: 'setMeta', patch: { label: e.target.value } })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="oneoff-date">Date</Label>
          <Input
            id="oneoff-date"
            type="date"
            disabled={saving}
            value={game.played_on}
            onChange={e => { if (e.target.value) run({ type: 'setMeta', patch: { played_on: e.target.value } }); }}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="oneoff-currency">Currency</Label>
          <Input
            id="oneoff-currency"
            maxLength={8}
            disabled={saving}
            value={currencyDraft ?? currency}
            onFocus={() => setCurrencyDraft(currency)}
            onChange={e => setCurrencyDraft(e.target.value)}
            // A blank reverts to the previous symbol, so amounts always show one.
            onBlur={() => {
              const next = currencyDraft;
              setCurrencyDraft(null);
              if (next !== null && next.trim() && next !== currency) {
                run({ type: 'setMeta', patch: { currency: next } });
              }
            }}
          />
        </div>
      </section>

      <SettlePlayers game={game} summary={summaryOf(settlement)} run={run} disabled={saving} />
      <SettlePayments game={game} run={run} disabled={saving} />

      <section className="surface space-y-2 p-3 sm:p-4" aria-live="polite">
        <h2 className="section-header px-1 pb-1">Who pays whom</h2>
        {/* Until every cash-out is in, the gap and the transfers would treat the gaps as 0: say what is missing instead. */}
        {missing.length > 0 ? null : settlement.status === 'refused' ? (
          <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm font-medium text-destructive">
            {describeRefusal(settlement.reason, currency)}
          </p>
        ) : transfers.length === 0 ? (
          <p className="px-1 text-sm text-muted-foreground">Nobody owes anything.</p>
        ) : (
          transfers.map((t, i) => (
            <div key={i} className="flex min-h-[48px] items-center gap-2 rounded-xl bg-muted/40 px-3 text-sm">
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-gold" aria-hidden="true" />
              <span>{`${nameOf(t.from_id)} pays ${nameOf(t.to_id)} ${formatCurrency(t.amount, currency)}`}</span>
            </div>
          ))
        )}
        {missing.length > 0 && (
          <p className="px-1 text-xs text-muted-foreground">
            {`Still to enter a cash-out: ${missing.map(p => p.name).join(', ')}`}
          </p>
        )}
      </section>

      <section className="surface space-y-1.5 p-3 sm:p-4">
        <Label htmlFor="oneoff-notes">Notes</Label>
        <Textarea
          id="oneoff-notes"
          maxLength={2000}
          disabled={saving}
          value={game.notes}
          onChange={e => run({ type: 'setMeta', patch: { notes: e.target.value } })}
        />
      </section>

      {saveError && (
        <p role="alert" className="px-1 text-sm font-medium text-destructive">{saveError}</p>
      )}

      <div className="sticky bottom-0 z-10 -mx-1 space-y-2 rounded-2xl border border-border/70 bg-[hsl(var(--popover)/0.92)] p-2.5 shadow-[0_16px_40px_-16px_hsl(0_0%_0%/0.95)] backdrop-blur-xl">
        <div className="flex gap-2">
          <Button variant="secondary" size="lg" className="flex-1" disabled={!ready} onClick={handleShare}>
            <Share2 />
            Share
          </Button>
          <Button size="lg" className="flex-[2]" disabled={!ready || saving || !user} onClick={handleSave}>
            {saving ? <Loader2 className="animate-spin" /> : <Save />}
            Save to my history
          </Button>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" className="w-full text-muted-foreground" disabled={saving}>Done</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Close without saving?</AlertDialogTitle>
              <AlertDialogDescription>This game will be gone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep editing</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  discard();
                  navigate('/one-off');
                }}
                className="bg-destructive bg-none text-destructive-foreground shadow-none hover:bg-destructive/90"
              >
                Close without saving
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

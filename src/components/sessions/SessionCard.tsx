import { useState } from 'react';
import { ActionError, SessionWithPlayers } from '@/types/database';
import { Button } from '@/components/ui/button';
import { format, parseISO } from 'date-fns';
import { ChevronDown, Edit, Trash2, CheckCircle2, ArrowRight, Share2, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { calculateSettlements, formatCurrency, formatProfit } from '@/lib/settlement';
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

interface SessionCardProps {
  session: SessionWithPlayers;
  currency: string;
  homegameName?: string;
  onEdit?: () => void;
  onDelete?: () => Promise<{ error: ActionError }>;
  onMarkSettled?: (settled: boolean) => Promise<{ error: ActionError }>;
  /** Open on first render (e.g. the session that was just logged). */
  defaultExpanded?: boolean;
}

export function SessionCard({
  session,
  currency,
  homegameName,
  onEdit,
  onDelete,
  onMarkSettled,
  defaultExpanded = false,
}: SessionCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [settling, setSettling] = useState(false);
  const contentId = `session-${session.id}`;

  const handleMarkSettled = async () => {
    if (!onMarkSettled) return;
    setSettling(true);
    await onMarkSettled(!session.is_settled);
    setSettling(false);
  };
  const [copied, setCopied] = useState(false);

  const payments = session.session_payments ?? [];
  const settlements = calculateSettlements(session.session_players, payments);
  const totalPot = session.session_players.reduce(
    (sum, sp) => sum + Number(sp.buy_in),
    0
  );

  const buildShareText = () => {
    const dateStr = format(parseISO(session.date), 'EEEE, MMM d, yyyy');
    const lines: string[] = [`🃏 ${homegameName ? homegameName + ' — ' : ''}${dateStr}`];

    // Settlements
    if (payments.length > 0) {
      lines.push('', '✅ Paid during game:');
      payments.forEach(p => {
        lines.push(`  ${p.from_player.name} → ${p.to_player.name}: ${currency}${Number(p.amount).toFixed(2)}`);
      });
    }

    if (settlements.length > 0) {
      lines.push('', payments.length > 0 ? '💸 Remaining settlements:' : '💸 Settlements:');
      settlements.forEach(s => {
        lines.push(`  ${s.from.name} → ${s.to.name}: ${currency}${s.amount.toFixed(2)}`);
      });
    } else if (payments.length > 0) {
      lines.push('', '💸 All settled during the game');
    }

    return lines.join('\n');
  };

  const handleShare = async () => {
    const text = buildShareText();

    if (navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch (e) {
        // User cancelled or share failed, fall through to copy
        if ((e as DOMException).name === 'AbortError') return;
      }
    }

    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({ title: 'Copied to clipboard' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Failed to copy', variant: 'destructive' });
    }
  };

  const sorted = [...session.session_players].sort(
    (a, b) => Number(b.cash_out) - Number(b.buy_in) - (Number(a.cash_out) - Number(a.buy_in))
  );
  const top = sorted[0];
  const topProfit = top ? Number(top.cash_out) - Number(top.buy_in) : 0;

  return (
    <article className={cn('surface overflow-hidden transition-colors', expanded && 'border-gold/30')}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-controls={contentId}
        className="flex w-full min-h-[72px] items-center gap-3 p-4 text-left transition-colors hover:bg-accent/40 focus:outline-none focus-visible:bg-accent/50"
      >
        <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl border border-border/70 bg-secondary/60 leading-none">
          <span className="text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-gold">{format(parseISO(session.date), 'MMM')}</span>
          <span className="font-display text-[1.35rem] font-semibold tabular-nums">{format(parseISO(session.date), 'd')}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-semibold">{format(parseISO(session.date), 'EEEE')}</span>
            {session.is_settled && (
              <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[0.6875rem] font-semibold text-success">
                <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                Settled
              </span>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-[0.8125rem] text-muted-foreground">
            <span>{session.session_players.length} players</span>
            <span aria-hidden="true">·</span>
            <span className="font-medium tabular-nums text-gold">{formatCurrency(totalPot, currency)}</span>
            {!expanded && top && topProfit > 0 && (
              <>
                <span aria-hidden="true" className="hidden min-[380px]:inline">·</span>
                <span className="hidden truncate min-[380px]:inline">
                  {top.player.name} <span className="profit tabular-nums">{formatProfit(topProfit, currency)}</span>
                </span>
              </>
            )}
          </div>
        </div>
        <ChevronDown
          className={cn('h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200', expanded && 'rotate-180 text-gold')}
          aria-hidden="true"
        />
        <span className="sr-only">{expanded ? 'Hide details' : 'Show results and settlements'}</span>
      </button>

      {expanded && (
        <div id={contentId} className="space-y-5 border-t border-border/50 p-4 pt-4 animate-fade-in">
          {session.notes && (
            <p className="text-sm text-muted-foreground">{session.notes}</p>
          )}

          {/* Results - Ledger style */}
          <div className="space-y-3">
            <span className="section-header">Results</span>
            <div className="rounded-xl border border-border/50 bg-muted/40 divide-y divide-border/50">
              {sorted.map((sp) => {
                  const profit = Number(sp.cash_out) - Number(sp.buy_in);
                  return (
                    <div
                      key={sp.id}
                      className="flex items-center justify-between gap-2 px-3 py-2.5"
                    >
                      <span className="font-medium text-sm truncate min-w-0">{sp.player.name}</span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="hidden sm:block text-xs text-muted-foreground tabular-nums">
                          {formatCurrency(Number(sp.buy_in), currency)} → {formatCurrency(Number(sp.cash_out), currency)}
                        </span>
                        <span className={`font-semibold text-sm tabular-nums ${profit >= 0 ? 'profit' : 'loss'}`}>
                          {formatProfit(profit, currency)}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Paid during game */}
          {payments.length > 0 && (
            <div className="space-y-3">
              <span className="section-header">Paid during game</span>
              <div className="space-y-2">
                {payments.map(p => (
                  <div
                    key={p.id}
                    className="flex min-h-[44px] items-center gap-2 px-3 py-2.5 rounded-xl bg-muted/40 text-sm"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                    <span className="font-medium">{p.from_player.name}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-medium">{p.to_player.name}</span>
                    <span className="ml-auto font-semibold tabular-nums text-muted-foreground">
                      {formatCurrency(Number(p.amount), currency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Remaining settlements */}
          {(settlements.length > 0 || payments.length > 0) && (
            <div className="space-y-3">
              <span className="section-header">
                {payments.length > 0 ? 'Remaining settlements' : 'Settlements'}
              </span>
              {settlements.length > 0 ? (
                <div className="space-y-2">
                  {settlements.map((settlement, i) => (
                    <div
                      key={i}
                      className="flex min-h-[44px] items-center gap-2 px-3 py-2.5 rounded-xl bg-muted/40 text-sm"
                    >
                      <span className="font-medium">{settlement.from.name}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-medium">{settlement.to.name}</span>
                      <span className="ml-auto font-semibold text-gold tabular-nums">
                        {formatCurrency(settlement.amount, currency)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground px-3 py-2.5 rounded-xl bg-muted/40">
                  All settled during the game
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="grid grid-cols-2 gap-2 border-t border-border/50 pt-4">
            <Button variant="secondary" onClick={handleShare}>
              {copied ? <Check /> : <Share2 />}
              {copied ? 'Copied' : 'Share'}
            </Button>
            {onMarkSettled && (
              <Button
                variant={session.is_settled ? 'secondary' : 'default'}
                onClick={handleMarkSettled}
                disabled={settling}
              >
                {settling ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
                {session.is_settled ? 'Unsettle' : 'Mark settled'}
              </Button>
            )}
            {onEdit && (
              <Button variant="ghost" onClick={onEdit}>
                <Edit />
                Edit
              </Button>
            )}
            {onDelete && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" className="text-destructive hover:text-destructive">
                    <Trash2 />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this session?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this session? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onDelete()}
                      className="bg-destructive bg-none text-destructive-foreground shadow-none hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

import { useState } from 'react';
import { SessionWithPlayers } from '@/types/database';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { ChevronDown, ChevronUp, Edit, Trash2, CheckCircle2, ArrowRight, Share2, Copy, Check } from 'lucide-react';
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
  onDelete?: () => Promise<{ error: any }>;
  onMarkSettled?: (settled: boolean) => Promise<{ error: any }>;
}

export function SessionCard({
  session,
  currency,
  homegameName,
  onEdit,
  onDelete,
  onMarkSettled,
}: SessionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const settlements = calculateSettlements(session.session_players);
  const totalPot = session.session_players.reduce(
    (sum, sp) => sum + Number(sp.buy_in),
    0
  );

  const buildShareText = () => {
    const dateStr = format(parseISO(session.date), 'EEEE, MMM d, yyyy');
    const lines: string[] = [`🃏 ${homegameName ? homegameName + ' — ' : ''}${dateStr}`];

    // Settlements
    if (settlements.length > 0) {
      lines.push('', '💸 Settlements:');
      settlements.forEach(s => {
        lines.push(`  ${s.from.name} → ${s.to.name}: ${currency}${s.amount.toFixed(2)}`);
      });
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

  return (
    <Card className="transition-all duration-150 hover:border-border/80">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="font-medium">
              {format(parseISO(session.date), 'EEEE, MMM d, yyyy')}
            </div>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="text-sm text-muted-foreground">
                {session.session_players.length} players
              </span>
              <span className="text-sm font-medium text-gold tabular-nums">
                {formatCurrency(totalPot, currency)}
              </span>
              {session.is_settled && (
                <Badge variant="secondary" className="text-xs font-normal">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Settled
                </Badge>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setExpanded(!expanded)}
            className="h-8 w-8 shrink-0"
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-5 pt-0 animate-fade-in">
          {session.notes && (
            <p className="text-sm text-muted-foreground">{session.notes}</p>
          )}

          {/* Results - Ledger style */}
          <div className="space-y-3">
            <span className="section-header">Results</span>
            <div className="rounded-lg bg-muted/30 divide-y divide-border/50">
              {session.session_players
                .sort((a, b) => {
                  const profitA = Number(a.cash_out) - Number(a.buy_in);
                  const profitB = Number(b.cash_out) - Number(b.buy_in);
                  return profitB - profitA;
                })
                .map((sp) => {
                  const profit = Number(sp.cash_out) - Number(sp.buy_in);
                  return (
                    <div
                      key={sp.id}
                      className="flex items-center justify-between px-3 py-2.5"
                    >
                      <span className="font-medium text-sm">{sp.player.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground tabular-nums">
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

          {/* Settlements */}
          {settlements.length > 0 && (
            <div className="space-y-3">
              <span className="section-header">Settlements</span>
              <div className="space-y-2">
                {settlements.map((settlement, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-muted/30 text-sm"
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
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-3 border-t border-border/50">
            <Button variant="secondary" size="sm" onClick={handleShare}>
              {copied ? <Check className="h-4 w-4 mr-1.5" /> : <Share2 className="h-4 w-4 mr-1.5" />}
              {copied ? 'Copied' : 'Share'}
            </Button>
            {onMarkSettled && (
              <Button
                variant={session.is_settled ? 'secondary' : 'default'}
                size="sm"
                onClick={() => onMarkSettled(!session.is_settled)}
              >
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                {session.is_settled ? 'Unsettle' : 'Mark Settled'}
              </Button>
            )}
            {onEdit && (
              <Button variant="secondary" size="sm" onClick={onEdit}>
                <Edit className="h-4 w-4 mr-1.5" />
                Edit
              </Button>
            )}
            {onDelete && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="secondary" size="sm" className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4 mr-1.5" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Session</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this session? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onDelete()}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

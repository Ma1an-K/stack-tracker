import { format, parseISO } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import type { OneOffPayment, OneOffTransfer } from '@/lib/oneOff/types';

interface ShareInput {
  label: string | null;
  played_on: string;
  currency: string;
  players: { id: string; name: string }[];
  payments: OneOffPayment[];
  transfers: OneOffTransfer[];
}

/** The same plain-text summary SessionCard shares, for a one-off game. */
export function buildOneOffShareText({ label, played_on, currency, players, payments, transfers }: ShareInput): string {
  const nameOf = (id: string) => players.find(p => p.id === id)?.name ?? 'Unknown';
  const dateStr = format(parseISO(played_on), 'EEEE, MMM d, yyyy');
  const title = label?.trim() ? label.trim() : 'One-off game';
  const lines: string[] = [`🃏 ${title} — ${dateStr}`];

  if (payments.length > 0) {
    lines.push('', '✅ Paid during game:');
    payments.forEach(p => {
      lines.push(`  ${nameOf(p.from_id)} → ${nameOf(p.to_id)}: ${currency}${Number(p.amount).toFixed(2)}`);
    });
  }

  if (transfers.length > 0) {
    lines.push('', payments.length > 0 ? '💸 Remaining settlements:' : '💸 Settlements:');
    transfers.forEach(t => {
      lines.push(`  ${nameOf(t.from_id)} → ${nameOf(t.to_id)}: ${currency}${t.amount.toFixed(2)}`);
    });
  } else if (payments.length > 0) {
    lines.push('', '💸 All settled during the game');
  }

  return lines.join('\n');
}

/** Native share sheet when there is one, else copy to the clipboard (as in SessionCard). */
export async function shareText(text: string): Promise<void> {
  if (navigator.share) {
    try {
      await navigator.share({ text });
      return;
    } catch (e) {
      // User cancelled or share failed, fall through to copy
      if ((e as DOMException).name === 'AbortError') return;
    }
  }

  try {
    await navigator.clipboard.writeText(text);
    toast({ title: 'Copied to clipboard' });
  } catch {
    toast({ title: 'Failed to copy', variant: 'destructive' });
  }
}

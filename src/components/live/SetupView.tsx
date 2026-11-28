import { useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { formatCurrency } from '@/lib/settlement';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Play, CheckCheck } from 'lucide-react';
import { NameChip } from './NameChip';
import type { RosterPlayer } from './LiveGameController';

const BUY_IN_PRESETS = [20, 50, 100, 200];

/* ------------------------------------------------------------------ */
/* Setup — pick who's playing and the default buy-in                    */
/* ------------------------------------------------------------------ */

export function SetupView({
  players,
  onStart,
  initialSelected,
}: {
  players: RosterPlayer[];
  onStart: (p: { player_id: string; buy_in: number }[], defaultBuyIn: number) => Promise<unknown>;
  /** Player ids seated when the view opens (e.g. everyone, from host setup). */
  initialSelected?: string[];
}) {
  const isMobile = useIsMobile();
  const [defaultBuyIn, setDefaultBuyIn] = useState('50');
  const [selected, setSelected] = useState<string[]>(() => initialSelected ?? []);
  const [starting, setStarting] = useState(false);

  const toggle = (id: string) =>
    setSelected(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));

  const amount = parseFloat(defaultBuyIn) || 0;
  const canStart = selected.length >= 2 && amount > 0;

  const handleStart = async () => {
    setStarting(true);
    await onStart(
      selected.map(player_id => ({ player_id, buy_in: amount })),
      amount
    );
    setStarting(false);
  };

  const allOn = selected.length === players.length && players.length > 0;

  return (
    <div className="space-y-5">
      <section className="surface space-y-3 p-4 sm:p-5">
        <h2 className="section-header">Standard buy-in</h2>
        <div className="grid grid-cols-4 gap-2" role="group" aria-label="Buy-in presets">
          {BUY_IN_PRESETS.map(v => (
            <button
              key={v}
              type="button"
              onClick={() => setDefaultBuyIn(String(v))}
              aria-pressed={amount === v}
              className={cn(
                'pressable h-11 rounded-xl border text-sm font-semibold tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                amount === v ? 'border-gold/60 bg-gold/15 text-gold' : 'border-border/70 bg-secondary/60 hover:bg-accent'
              )}
            >
              {v}
            </button>
          ))}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="default-buy-in">Or enter an amount</Label>
          <Input
            id="default-buy-in"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={defaultBuyIn}
            onChange={e => setDefaultBuyIn(e.target.value)}
            className={cn('tabular-nums', isMobile ? 'h-12' : 'h-11')}
          />
          <p className="text-xs text-muted-foreground">Everyone starts with this. Rebuys use it as the quick-tap amount.</p>
        </div>
      </section>

      <section className="surface space-y-3 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="section-header">Who's playing</h2>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setSelected(allOn ? [] : players.map(p => p.id))}
            className="text-gold"
          >
            <CheckCheck />
            {allOn ? 'Clear' : 'Everyone'}
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {players.map(p => (
            <NameChip key={p.id} on={selected.includes(p.id)} onClick={() => toggle(p.id)}>
              {p.name}
            </NameChip>
          ))}
        </div>
      </section>

      <div className="sticky bottom-0 z-10 -mx-1 rounded-2xl border border-border/70 bg-[hsl(var(--popover)/0.92)] p-2.5 shadow-[0_16px_40px_-16px_hsl(0_0%_0%/0.95)] backdrop-blur-xl ">
        <p role="status" className="mb-2 text-center text-[0.8125rem] font-medium text-muted-foreground tabular-nums">
          {selected.length < 2
            ? `Pick ${2 - selected.length} more player${selected.length === 1 ? '' : 's'}`
            : `${selected.length} players · ${formatCurrency(selected.length * amount)} on the table`}
        </p>
        <Button size="lg" className="w-full" disabled={!canStart || starting} onClick={handleStart}>
          {starting ? <Loader2 className="animate-spin" /> : <Play className="fill-current" />}
          Start session
        </Button>
      </div>
    </div>
  );
}

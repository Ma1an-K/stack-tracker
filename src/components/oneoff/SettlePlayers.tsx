import { useState } from 'react';
import { Trash2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency, formatProfit } from '@/lib/settlement';
import { cn } from '@/lib/utils';
import type { OneOffGame } from '@/lib/oneOff/types';
import type { OneOffAction } from '@/lib/oneOff/reducer';
import { MoneyField } from './MoneyField';
import { NameField } from './NameField';

interface SettlePlayersProps {
  game: OneOffGame;
  run: (action: OneOffAction) => { error: string | null };
  /** Locks every control, e.g. while the game is being saved. */
  disabled?: boolean;
}

/** Every player's buy-in and cash-out on the settle screen, with add, rename and remove. */
export function SettlePlayers({ game, run, disabled = false }: SettlePlayersProps) {
  const [newName, setNewName] = useState('');
  const { currency } = game;
  const totalBuyIn = game.players.reduce((s, p) => s + p.buy_in, 0);
  const totalCashOut = game.players.reduce((s, p) => s + (p.cash_out ?? 0), 0);

  const addPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled || !newName.trim()) return;
    const { error } = run({ type: 'addPlayer', id: crypto.randomUUID(), name: newName, buyIn: 0 });
    if (!error) setNewName('');
  };

  return (
    <section className="surface space-y-2 p-3 sm:p-4">
      {/* Below sm the name takes its own line above the amounts, so it is never squeezed. */}
      <div className="grid grid-cols-[1fr_1fr_2.75rem] sm:grid-cols-[1fr_6.5rem_6.5rem_2.75rem] items-end gap-x-1.5 gap-y-2 px-1 pb-1 text-[0.6875rem] uppercase tracking-[0.1em] text-muted-foreground">
        <h2 className="section-header col-span-3 sm:col-span-1">Players</h2>
        <span className="text-right">Buy-in</span>
        <span className="text-right">Cash-out</span>
        <span className="sr-only">Remove</span>
      </div>

      {game.players.map(p => {
        const profit = p.cash_out === null ? null : p.cash_out - p.buy_in;
        return (
          <div key={p.id} className="rounded-xl border border-border/60 bg-muted/40 p-2">
            <div className="grid grid-cols-[1fr_1fr_2.75rem] sm:grid-cols-[1fr_6.5rem_6.5rem_2.75rem] items-center gap-1.5">
              <NameField
                className="col-span-3 sm:col-span-1"
                value={p.name}
                label={`Name for ${p.name}`}
                disabled={disabled}
                onCommit={name => run({ type: 'renamePlayer', id: p.id, name })}
              />
              <MoneyField
                value={p.buy_in}
                currency={currency}
                label={`Buy-in for ${p.name}`}
                disabled={disabled}
                onCommit={v => run({ type: 'setBuyIn', id: p.id, total: v ?? 0 })}
              />
              <MoneyField
                value={p.cash_out}
                currency={currency}
                label={`Cash-out for ${p.name}`}
                disabled={disabled}
                allowEmpty
                onCommit={v =>
                  run(v === null ? { type: 'rejoin', id: p.id } : { type: 'setCashOut', id: p.id, amount: v })
                }
              />
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-destructive"
                disabled={disabled}
                onClick={() => run({ type: 'removePlayer', id: p.id })}
                aria-label={`Remove ${p.name}`}
              >
                <Trash2 />
              </Button>
            </div>
            {profit !== null && Math.abs(profit) > 0.005 && (
              <p className={cn('px-1 pt-1 text-xs font-medium tabular-nums', profit > 0 ? 'profit' : 'loss')}>
                {formatProfit(profit, currency)}
              </p>
            )}
          </div>
        );
      })}

      <form onSubmit={addPlayer} className="flex gap-2 pt-1">
        <Input
          aria-label="New player"
          placeholder="New player"
          value={newName}
          maxLength={60}
          disabled={disabled}
          onChange={e => setNewName(e.target.value)}
          className="h-11"
        />
        <Button type="submit" variant="outline" className="h-11 shrink-0 border-dashed" disabled={disabled || !newName.trim()}>
          <UserPlus />
          Add player
        </Button>
      </form>

      <dl className="grid grid-cols-2 gap-2 border-t border-border/50 px-1 pt-3 text-sm">
        <div>
          <dt className="text-[0.6875rem] uppercase tracking-[0.1em] text-muted-foreground">Total buy-ins</dt>
          <dd className="font-semibold tabular-nums">{formatCurrency(totalBuyIn, currency)}</dd>
        </div>
        <div className="text-right">
          <dt className="text-[0.6875rem] uppercase tracking-[0.1em] text-muted-foreground">Total cash-outs</dt>
          <dd className="font-semibold tabular-nums">{formatCurrency(totalCashOut, currency)}</dd>
        </div>
      </dl>
    </section>
  );
}

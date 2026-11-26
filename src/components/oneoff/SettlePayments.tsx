import { useState } from 'react';
import { ArrowRight, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { NameChip } from '@/components/live/NameChip';
import { formatCurrency } from '@/lib/settlement';
import type { OneOffGame } from '@/lib/oneOff/types';
import type { OneOffAction } from '@/lib/oneOff/reducer';

interface SettlePaymentsProps {
  game: OneOffGame;
  run: (action: OneOffAction) => { error: string | null };
  /** Locks every control, e.g. while the game is being saved. */
  disabled?: boolean;
}

/** Payments already made between players, with add (same picker as the live tracker) and remove. */
export function SettlePayments({ game, run, disabled = false }: SettlePaymentsProps) {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const nameOf = (id: string) => game.players.find(p => p.id === id)?.name ?? 'Unknown';
  const parsed = Math.round((parseFloat(amount) || 0) * 100) / 100;

  const openDialog = () => {
    setFrom('');
    setTo('');
    setAmount('');
    setOpen(true);
  };

  const submit = () => {
    if (disabled || !from || !to || from === to || !(parsed > 0)) return;
    const { error } = run({ type: 'addPayment', payment: { from_id: from, to_id: to, amount: parsed } });
    if (!error) setOpen(false);
  };

  return (
    <section className="surface space-y-2 p-3 sm:p-4">
      <div className="flex items-center justify-between gap-2 px-1 pb-1">
        <h2 className="section-header">Payments</h2>
        <Button variant="outline" size="sm" className="border-dashed" disabled={disabled} onClick={openDialog}>
          <Plus />
          Record payment
        </Button>
      </div>
      {game.payments.length === 0 ? (
        <p className="px-1 pb-1 text-xs text-muted-foreground">
          Cash that already changed hands gets subtracted from who pays whom.
        </p>
      ) : (
        game.payments.map((p, i) => (
          <div key={i} className="flex min-h-[48px] items-center gap-2 rounded-xl bg-muted/40 pl-3 text-sm">
            <span className="font-medium">{nameOf(p.from_id)}</span>
            <ArrowRight className="h-3.5 w-3.5 text-gold" aria-hidden="true" />
            <span className="font-medium">{nameOf(p.to_id)}</span>
            <span className="ml-auto font-semibold tabular-nums text-gold">{formatCurrency(p.amount, game.currency)}</span>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-destructive"
              disabled={disabled}
              onClick={() => run({ type: 'removePayment', index: i })}
              aria-label="Remove payment"
            >
              <Trash2 />
            </Button>
          </div>
        ))
      )}

      <Dialog open={open && !disabled} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Record payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-[0.8125rem] font-medium text-secondary-foreground">From</p>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Who paid">
                {game.players.map(p => (
                  <NameChip key={p.id} on={from === p.id} onClick={() => { setFrom(p.id); if (to === p.id) setTo(''); }}>
                    {p.name}
                  </NameChip>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-[0.8125rem] font-medium text-secondary-foreground">To</p>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Who received it">
                {game.players.filter(p => p.id !== from).map(p => (
                  <NameChip key={p.id} on={to === p.id} onClick={() => setTo(p.id)}>
                    {p.name}
                  </NameChip>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="settle-pay-amount">Amount</Label>
              <Input
                id="settle-pay-amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="h-12 text-lg tabular-nums"
              />
            </div>
          </div>
          <DialogFooter>
            <Button size="lg" className="w-full" disabled={!from || !to || from === to || !(parsed > 0)} onClick={submit}>
              Save payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { formatCurrency } from '@/lib/settlement';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, MoreHorizontal, Trash2, Users, Clock, Flag, Radio, UserPlus, LogOut, Undo2, ArrowRight } from 'lucide-react';
import { LivePulse } from '@/components/sessions/LivePulse';
import { BuyInField } from '@/components/sessions/BuyInField';
import { AddPlayerDialog } from '@/components/sessions/AddPlayerDialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { NameChip } from './NameChip';
import type { LiveGameController, RosterPlayer } from './LiveGameController';

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function useElapsed(startedAt: string | undefined) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  if (!startedAt) return '';
  const mins = Math.max(0, Math.floor((now - parseISO(startedAt).getTime()) / 60_000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/* ------------------------------------------------------------------ */
/* Tracker — the running game                                          */
/* ------------------------------------------------------------------ */

export function TrackerView({ controller }: { controller: LiveGameController }) {
  const navigate = useNavigate();
  const {
    roster: players,
    createPlayer,
    canCreatePlayer,
    ownerName,
    currency,
    totalPot,
    totalBuyIn,
    seatedCount,
    addBuyIn,
    setBuyIn,
    addPlayer,
    removePlayer,
    cashOut,
    rejoin,
    addPayment,
    removePayment,
  } = controller;
  const elapsed = useElapsed(controller.startedAt);

  const [customFor, setCustomFor] = useState<RosterPlayer | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [cashOutFor, setCashOutFor] = useState<RosterPlayer | null>(null);
  const [cashOutAmount, setCashOutAmount] = useState('');
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [payFrom, setPayFrom] = useState('');
  const [payTo, setPayTo] = useState('');
  const [payAmount, setPayAmount] = useState('');

  const base = Number(controller.defaultBuyIn);
  const chips = [base, base * 2];
  const nameOf = (id: string) => players.find(p => p.id === id)?.name ?? 'Unknown';
  const seated = controller.players;
  const bench = players.filter(p => p.is_active && !seated.some(sp => sp.player_id === p.id));

  const payments = controller.payments;
  const lossOf = (sp: LiveGameController['players'][number]) =>
    sp.cash_out === undefined ? 0 : Number(sp.buy_in) - Number(sp.cash_out);

  const openPayment = (from = '', amount = '') => {
    setPayFrom(from);
    setPayTo('');
    setPayAmount(amount);
    setPaymentOpen(true);
  };

  const submitCashOut = async () => {
    if (!cashOutFor) return;
    const amount = Math.round(Math.max(0, parseFloat(cashOutAmount) || 0) * 100) / 100;
    const sp = seated.find(p => p.player_id === cashOutFor.id);
    const { error } = await cashOut(cashOutFor.id, amount);
    setCashOutFor(null);
    if (!error && sp) {
      const loss = Number(sp.buy_in) - amount;
      // Losers usually pay on the way out — offer to record it straight away.
      if (loss > 0) openPayment(cashOutFor.id, loss.toFixed(2));
    }
  };

  const submitPayment = async () => {
    const amount = Math.round((parseFloat(payAmount) || 0) * 100) / 100;
    if (!payFrom || !payTo || payFrom === payTo || amount <= 0) return;
    const { error } = await addPayment({ from_player_id: payFrom, to_player_id: payTo, amount });
    if (!error) setPaymentOpen(false);
  };

  const openCustom = (player?: RosterPlayer) => {
    if (player) {
      setCustomFor(player);
      setCustomAmount('');
    }
  };

  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-xl border border-gold/45 bg-[linear-gradient(135deg,hsl(var(--gold)/0.14),hsl(var(--card))_55%)] p-4 shadow-[0_0_32px_-12px_hsl(var(--gold)/0.55)]">
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <LivePulse />
              <span className="section-header">Live</span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.8125rem] text-muted-foreground">
              <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" aria-hidden="true" />{elapsed}</span>
              <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" aria-hidden="true" />{seatedCount} seated</span>
              <span>since {format(parseISO(controller.startedAt), 'h:mm a')}</span>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">On the table</div>
            <div className="font-display text-[2.4rem] font-semibold leading-none tabular-nums text-gold">{formatCurrency(totalPot, currency)}</div>
          </div>
        </div>
      </section>

      <section className="surface space-y-2 p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2 px-1 pb-1">
          <h2 className="section-header">Buy-ins</h2>
          <Button variant="outline" size="sm" className="border-dashed" onClick={() => setAddOpen(true)}>
            <UserPlus />
            Add player
          </Button>
        </div>

        {seated.map(sp => {
          const player = players.find(p => p.id === sp.player_id);
          const left = sp.cash_out !== undefined;
          const name = nameOf(sp.player_id);
          return (
            <div key={sp.player_id} className={cn('rounded-xl border border-border/60 bg-muted/40 p-3', left && 'opacity-80')}>
              <div className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2 font-medium">
                  <span className="truncate">{name}</span>
                  {left && (
                    <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-muted-foreground">
                      Left
                    </span>
                  )}
                </span>
                {left ? (
                  <span className="text-sm tabular-nums">
                    <span className="text-muted-foreground">{formatCurrency(Number(sp.buy_in), currency)} → </span>
                    <span className="font-semibold text-gold">{formatCurrency(Number(sp.cash_out), currency)}</span>
                  </span>
                ) : (
                  <BuyInField
                    value={Number(sp.buy_in)}
                    currency={currency}
                    label={`Buy-in total for ${name}`}
                    onCommit={t => setBuyIn(sp.player_id, t)}
                  />
                )}
              </div>
              {left ? (
                <div className="mt-2 flex items-center gap-1.5">
                  <span className={cn('flex-1 text-[0.8125rem] font-medium tabular-nums', lossOf(sp) > 0 ? 'loss' : 'profit')}>
                    {lossOf(sp) > 0 ? `Down ${formatCurrency(lossOf(sp), currency)}` : `Up ${formatCurrency(-lossOf(sp), currency)}`}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => openPayment(sp.player_id, lossOf(sp) > 0 ? lossOf(sp).toFixed(2) : '')}
                  >
                    Payment
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                    onClick={() => { if (player) { setCashOutFor(player); setCashOutAmount(String(sp.cash_out)); } }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                    onClick={() => rejoin(sp.player_id)}
                    aria-label={`${name} rejoins`}
                  >
                    <Undo2 />
                    Rejoin
                  </Button>
                </div>
              ) : (
                <>
                  <div className="mt-2 grid grid-cols-4 gap-1.5">
                    <Button
                      variant="ghost"
                      className="h-11 border border-border/60 px-0 text-muted-foreground tabular-nums"
                      onClick={() => addBuyIn(sp.player_id, -base)}
                      disabled={Number(sp.buy_in) <= 0}
                      aria-label={`Remove ${base} from ${name}`}
                    >
                      {`\u2212${base}`}
                    </Button>
                    {chips.map(amt => (
                      <Button
                        key={amt}
                        variant="secondary"
                        className="h-11 px-0 tabular-nums"
                        onClick={() => addBuyIn(sp.player_id, amt)}
                        aria-label={`Add ${amt} to ${name}`}
                      >
                        <Plus className="!size-3.5 text-gold" aria-hidden="true" />
                        {amt}
                      </Button>
                    ))}
                    <Button
                      variant="secondary"
                      className="h-11 px-0"
                      onClick={() => openCustom(player)}
                    >
                      Other
                    </Button>
                  </div>
                  <div className="-mb-1 -mr-1 mt-1 flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground"
                      onClick={() => { if (player) { setCashOutFor(player); setCashOutAmount(''); } }}
                    >
                      <LogOut />
                      Cash out {name.split(' ')[0]}
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0 text-muted-foreground"
                          aria-label={`More options for ${name}`}
                        >
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onSelect={() => removePlayer(sp.player_id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remove from session
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </>
              )}
            </div>
          );
        })}

        <dl className="grid grid-cols-2 gap-2 border-t border-border/50 px-1 pt-3 text-sm">
          <div>
            <dt className="text-[0.6875rem] uppercase tracking-[0.1em] text-muted-foreground">Total buy-ins</dt>
            <dd className="font-semibold tabular-nums">{formatCurrency(totalBuyIn, currency)}</dd>
          </div>
          <div className="text-right">
            <dt className="text-[0.6875rem] uppercase tracking-[0.1em] text-muted-foreground">On the table</dt>
            <dd className="font-semibold tabular-nums">{formatCurrency(totalPot, currency)}</dd>
          </div>
        </dl>
      </section>

      <section className="surface space-y-2 p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2 px-1 pb-1">
          <h2 className="section-header">Payments</h2>
          <Button variant="outline" size="sm" className="border-dashed" onClick={() => openPayment()}>
            <Plus />
            Record payment
          </Button>
        </div>
        {payments.length === 0 ? (
          <p className="px-1 pb-1 text-xs text-muted-foreground">
            Cash that changes hands mid-game (like someone paying up before leaving) gets subtracted from the final settlement.
          </p>
        ) : (
          payments.map((p, i) => (
            <div key={i} className="flex min-h-[48px] items-center gap-2 rounded-xl bg-muted/40 pl-3 text-sm">
              <span className="font-medium">{nameOf(p.from_player_id)}</span>
              <ArrowRight className="h-3.5 w-3.5 text-gold" aria-hidden="true" />
              <span className="font-medium">{nameOf(p.to_player_id)}</span>
              <span className="ml-auto font-semibold tabular-nums text-gold">{formatCurrency(Number(p.amount), currency)}</span>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => removePayment(i)}
                aria-label="Remove payment"
              >
                <Trash2 />
              </Button>
            </div>
          ))
        )}
      </section>

      <p className="flex items-center gap-1.5 px-1 text-xs text-muted-foreground">
        <Radio className="h-3 w-3 text-success" aria-hidden="true" />
        Every tap saves instantly. Close the app and pick up where you left off.
      </p>

      <div className="sticky bottom-0 z-10 -mx-1 rounded-2xl border border-border/70 bg-[hsl(var(--popover)/0.92)] p-2.5 shadow-[0_16px_40px_-16px_hsl(0_0%_0%/0.95)] backdrop-blur-xl ">
        <Button
          size="lg"
          className="w-full"
          disabled={seated.length < 2}
          onClick={() => navigate(controller.endHref)}
        >
          <Flag />
          End session &amp; cash out
        </Button>
      </div>

      {/* Custom amount (the exact total is edited inline on the row) */}
      <Dialog open={!!customFor} onOpenChange={o => !o && setCustomFor(null)}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>{customFor?.name}</DialogTitle>
            {customFor && (
              <p className="text-sm text-muted-foreground tabular-nums">
                Currently {formatCurrency(Number(seated.find(sp => sp.player_id === customFor.id)?.buy_in ?? 0), currency)} in
              </p>
            )}
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="custom-amount">Amount</Label>
            <Input
              id="custom-amount"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={customAmount}
              onChange={e => setCustomAmount(e.target.value)}
              autoFocus
              className="h-14 text-center font-display text-3xl tabular-nums"
            />
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              size="lg"
              className="w-full"
              disabled={!customAmount}
              onClick={() => { if (customFor) addBuyIn(customFor.id, parseFloat(customAmount) || 0); setCustomFor(null); }}
            >
              Add to buy-in
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Late arrival: seat someone from the bench, or (owner/admin) create and seat a new player */}
      <AddPlayerDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        bench={bench}
        canCreate={canCreatePlayer}
        ownerName={ownerName}
        baseBuyIn={base}
        currency={currency}
        onSeat={id => addPlayer(id, base)}
        onCreate={createPlayer}
      />

      {/* Cash out (player leaving) */}
      <Dialog open={!!cashOutFor} onOpenChange={o => !o && setCashOutFor(null)}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>{cashOutFor?.name} cashes out</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="cash-out-amount">Chips they're taking</Label>
            <Input
              id="cash-out-amount"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={cashOutAmount}
              onChange={e => setCashOutAmount(e.target.value)}
              autoFocus
              className="h-14 text-center font-display text-3xl tabular-nums"
            />
            <p className="text-xs text-muted-foreground">
              Locks their result. You can edit it until the session ends.
            </p>
          </div>
          <DialogFooter>
            <Button size="lg" className="w-full" disabled={cashOutAmount === ''} onClick={submitCashOut}>
              <LogOut />
              Cash out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record a payment */}
      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Record payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-[0.8125rem] font-medium text-secondary-foreground">From</p>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Who paid">
                {seated.map(sp => (
                  <NameChip
                    key={sp.player_id}
                    on={payFrom === sp.player_id}
                    onClick={() => { setPayFrom(sp.player_id); if (payTo === sp.player_id) setPayTo(''); }}
                  >
                    {nameOf(sp.player_id)}
                  </NameChip>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-[0.8125rem] font-medium text-secondary-foreground">To</p>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Who received it">
                {seated.filter(sp => sp.player_id !== payFrom).map(sp => (
                  <NameChip key={sp.player_id} on={payTo === sp.player_id} onClick={() => setPayTo(sp.player_id)}>
                    {nameOf(sp.player_id)}
                  </NameChip>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pay-amount">Amount</Label>
              <Input
                id="pay-amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={payAmount}
                onChange={e => setPayAmount(e.target.value)}
                className="h-12 text-lg tabular-nums"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              size="lg"
              className="w-full"
              disabled={!payFrom || !payTo || payFrom === payTo || !(Math.round((parseFloat(payAmount) || 0) * 100) / 100 > 0)}
              onClick={submitPayment}
            >
              Save payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

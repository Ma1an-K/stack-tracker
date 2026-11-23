import { useState } from 'react';
import { ActionError, Player, SessionPaymentInput, SessionWithPlayers } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Trash2, AlertCircle, CheckCircle2, UserPlus, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface PlayerEntry {
  player_id: string;
  buy_in: string;
  cash_out: string;
}

interface PaymentEntry {
  key: number; // stable key for React while editing
  from_player_id: string;
  to_player_id: string;
  amount: string;
}

interface SessionFormProps {
  players: Player[];
  existingSession?: SessionWithPlayers;
  onSubmit: (
    date: string,
    players: { player_id: string; buy_in: number; cash_out: number }[],
    notes: string | undefined,
    payments: SessionPaymentInput[]
  ) => Promise<{ error: ActionError }>;
  onCancel?: () => void;
  onAddPlayer?: (name: string) => Promise<{ error: ActionError }>;
  /** Pre-seed rows (e.g. from a live session). Buy-ins filled, cash-outs left blank unless already cashed out. */
  initialPlayers?: { player_id: string; buy_in: number; cash_out?: number }[];
  initialPayments?: SessionPaymentInput[];
  initialNotes?: string;
  /** Homegame currency symbol for totals (display only). */
  currency?: string;
}

export function SessionForm({ players, existingSession, onSubmit, onCancel, onAddPlayer, initialPlayers, initialPayments, initialNotes, currency = '$' }: SessionFormProps) {
  const isMobile = useIsMobile();
  const [date, setDate] = useState(
    existingSession?.date || format(new Date(), 'yyyy-MM-dd')
  );
  const [notes, setNotes] = useState(existingSession?.notes || initialNotes || '');
  const [selectedPlayers, setSelectedPlayers] = useState<PlayerEntry[]>(
    existingSession?.session_players.map(sp => ({
      player_id: sp.player_id,
      buy_in: sp.buy_in.toString(),
      cash_out: sp.cash_out.toString(),
    })) ||
      initialPlayers?.map(p => ({
        player_id: p.player_id,
        buy_in: p.buy_in.toString(),
        cash_out: p.cash_out !== undefined ? p.cash_out.toString() : '',
      })) ||
      []
  );
  const [payments, setPayments] = useState<PaymentEntry[]>(() => {
    const source = existingSession?.session_payments?.map(p => ({
      from_player_id: p.from_player_id,
      to_player_id: p.to_player_id,
      amount: Number(p.amount),
    })) ?? initialPayments ?? [];
    return source.map((p, i) => ({ key: i, ...p, amount: p.amount.toString() }));
  });
  const [nextPaymentKey, setNextPaymentKey] = useState(payments.length);
  const [submitting, setSubmitting] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [addingPlayer, setAddingPlayer] = useState(false);
  const [showAddPlayer, setShowAddPlayer] = useState(false);

  const activePlayers = players.filter(p => p.is_active);
  const availablePlayers = activePlayers.filter(
    p => !selectedPlayers.some(sp => sp.player_id === p.id)
  );

  const addPlayer = (playerId: string) => {
    setSelectedPlayers([
      ...selectedPlayers,
      { player_id: playerId, buy_in: '', cash_out: '' },
    ]);
  };

  const removePlayer = (playerId: string) => {
    setSelectedPlayers(selectedPlayers.filter(p => p.player_id !== playerId));
    setPayments(payments.filter(p => p.from_player_id !== playerId && p.to_player_id !== playerId));
  };

  const addPayment = () => {
    setPayments([...payments, { key: nextPaymentKey, from_player_id: '', to_player_id: '', amount: '' }]);
    setNextPaymentKey(nextPaymentKey + 1);
  };

  const updatePayment = (key: number, field: 'from_player_id' | 'to_player_id' | 'amount', value: string) => {
    setPayments(payments.map(p => (p.key === key ? { ...p, [field]: value } : p)));
  };

  const removePayment = (key: number) => {
    setPayments(payments.filter(p => p.key !== key));
  };

  const updatePlayer = (playerId: string, field: 'buy_in' | 'cash_out', value: string) => {
    setSelectedPlayers(
      selectedPlayers.map(p =>
        p.player_id === playerId ? { ...p, [field]: value } : p
      )
    );
  };

  const getPlayerName = (playerId: string) => {
    return players.find(p => p.id === playerId)?.name || 'Unknown';
  };

  const handleAddNewPlayer = async () => {
    if (!newPlayerName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a player name',
        variant: 'destructive',
      });
      return;
    }

    if (!onAddPlayer) return;

    setAddingPlayer(true);
    const { error } = await onAddPlayer(newPlayerName.trim());
    setAddingPlayer(false);

    if (!error) {
      setNewPlayerName('');
      setShowAddPlayer(false);
    }
  };

  const totalBuyIn = selectedPlayers.reduce(
    (sum, p) => sum + (parseFloat(p.buy_in) || 0),
    0
  );
  const totalCashOut = selectedPlayers.reduce(
    (sum, p) => sum + (parseFloat(p.cash_out) || 0),
    0
  );
  const isBalanced = Math.abs(totalBuyIn - totalCashOut) < 0.01;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedPlayers.length < 2) {
      toast({
        title: 'Error',
        description: 'You need at least 2 players for a session',
        variant: 'destructive',
      });
      return;
    }

    const hasEmptyValues = selectedPlayers.some(
      p => p.buy_in === '' || p.cash_out === ''
    );
    if (hasEmptyValues) {
      toast({
        title: 'Error',
        description: 'Please fill in all buy-in and cash-out values',
        variant: 'destructive',
      });
      return;
    }

    if (!isBalanced) {
      toast({
        title: 'Error',
        description: 'Total buy-ins must equal total cash-outs',
        variant: 'destructive',
      });
      return;
    }

    const badPayment = payments.find(
      p =>
        !p.from_player_id ||
        !p.to_player_id ||
        p.from_player_id === p.to_player_id ||
        !(parseFloat(p.amount) > 0)
    );
    if (badPayment) {
      toast({
        title: 'Error',
        description: 'Each payment needs a payer, a different recipient, and an amount above 0',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    const { error } = await onSubmit(
      date,
      selectedPlayers.map(p => ({
        player_id: p.player_id,
        buy_in: parseFloat(p.buy_in),
        cash_out: parseFloat(p.cash_out),
      })),
      notes || undefined,
      payments.map(p => ({
        from_player_id: p.from_player_id,
        to_player_id: p.to_player_id,
        amount: Math.round(parseFloat(p.amount) * 100) / 100,
      }))
    );
    setSubmitting(false);

    if (!error && onCancel) {
      onCancel();
    }
  };

  const hasEmpty = selectedPlayers.some(p => p.buy_in === '' || p.cash_out === '');
  const diff = totalBuyIn - totalCashOut;
  const money = (n: number) => `${currency}${Math.abs(n).toFixed(2)}`;
  const status: { tone: 'muted' | 'bad' | 'good'; text: string } =
    selectedPlayers.length < 2
      ? { tone: 'muted', text: `Add ${2 - selectedPlayers.length} more player${selectedPlayers.length === 1 ? '' : 's'}` }
      : hasEmpty
        ? { tone: 'muted', text: 'Fill in every buy-in and cash-out' }
        : !isBalanced
          ? { tone: 'bad', text: `Off by ${money(diff)}: cash-outs ${diff > 0 ? 'short' : 'over'}` }
          : { tone: 'good', text: `Balanced · ${money(totalBuyIn)} in play` };
  const inDialog = !!onCancel;
  const fieldH = isMobile ? 'h-12' : 'h-11';

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <section className="surface space-y-4 p-4 sm:p-5">
        <h2 className="section-header">{existingSession ? 'Session details' : 'When'}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className={fieldH}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes <span className="text-muted-foreground">(optional)</span></Label>
            <Textarea
              id="notes"
              placeholder="Anything worth remembering…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={1}
              className="min-h-[48px] resize-none"
            />
          </div>
        </div>
      </section>

      <section className="surface space-y-4 p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <h2 className="section-header">Players</h2>
          {selectedPlayers.length > 0 && (
            <span className="text-xs text-muted-foreground tabular-nums">{selectedPlayers.length} at the table</span>
          )}
        </div>

        {(availablePlayers.length > 0 || onAddPlayer) && (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Add players">
            {availablePlayers.map((player) => (
              <button
                key={player.id}
                type="button"
                onClick={() => addPlayer(player.id)}
                className="pressable inline-flex h-11 items-center gap-1.5 rounded-full border border-border/80 bg-secondary/70 px-4 text-sm font-medium hover:border-gold/40 hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Plus className="h-4 w-4 text-gold" aria-hidden="true" />
                {player.name}
              </button>
            ))}
            {onAddPlayer && (
              <button
                type="button"
                onClick={() => setShowAddPlayer(!showAddPlayer)}
                aria-expanded={showAddPlayer}
                className="pressable inline-flex h-11 items-center gap-1.5 rounded-full border border-dashed border-gold/40 px-4 text-sm font-medium text-gold hover:bg-gold/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <UserPlus className="h-4 w-4" aria-hidden="true" />
                New player
              </button>
            )}
          </div>
        )}

        {showAddPlayer && onAddPlayer && (
          <div className="flex gap-2 rounded-xl border border-dashed border-gold/30 bg-muted/40 p-2.5">
            <Input
              placeholder="Player name"
              aria-label="New player name"
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddNewPlayer())}
              className="h-11 flex-1"
              autoFocus
            />
            <Button
              type="button"
              onClick={handleAddNewPlayer}
              disabled={addingPlayer || !newPlayerName.trim()}
            >
              {addingPlayer ? <Loader2 className="animate-spin" /> : 'Add'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Cancel new player"
              onClick={() => { setShowAddPlayer(false); setNewPlayerName(''); }}
            >
              <Trash2 />
            </Button>
          </div>
        )}

        {selectedPlayers.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
            Tap a name above to seat them
          </p>
        ) : (
          <ul className="space-y-2">
            {selectedPlayers.map((entry) => {
              const bi = parseFloat(entry.buy_in);
              const co = parseFloat(entry.cash_out);
              const net = !isNaN(bi) && !isNaN(co) ? co - bi : null;
              return (
                <li key={entry.player_id} className="rounded-xl border border-border/60 bg-muted/40 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="truncate font-medium">{getPlayerName(entry.player_id)}</span>
                    <span className="flex items-center gap-1">
                      {net !== null && (
                        <span className={cn('text-sm font-semibold tabular-nums', net >= 0 ? 'profit' : 'loss')}>
                          {net >= 0 ? '+' : '-'}{money(net)}
                        </span>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removePlayer(entry.player_id)}
                        aria-label={`Remove ${getPlayerName(entry.player_id)}`}
                        className="-mr-1.5 h-10 w-10 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 />
                      </Button>
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="space-y-1">
                      <span className="block text-[0.6875rem] font-medium uppercase tracking-[0.1em] text-muted-foreground">Buy-in</span>
                      <Input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={entry.buy_in}
                        onChange={(e) => updatePlayer(entry.player_id, 'buy_in', e.target.value)}
                        className={cn(fieldH, 'tabular-nums')}
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="block text-[0.6875rem] font-medium uppercase tracking-[0.1em] text-muted-foreground">Cash-out</span>
                      <Input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={entry.cash_out}
                        onChange={(e) => updatePlayer(entry.player_id, 'cash_out', e.target.value)}
                        className={cn(fieldH, 'tabular-nums')}
                      />
                    </label>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {selectedPlayers.length > 0 && (
          <dl className="grid grid-cols-2 gap-2 border-t border-border/50 pt-4 text-sm">
            <div className="rounded-xl bg-muted/40 px-3 py-2">
              <dt className="text-[0.6875rem] uppercase tracking-[0.1em] text-muted-foreground">Total buy-in</dt>
              <dd className="font-semibold tabular-nums">{money(totalBuyIn)}</dd>
            </div>
            <div className="rounded-xl bg-muted/40 px-3 py-2">
              <dt className="text-[0.6875rem] uppercase tracking-[0.1em] text-muted-foreground">Total cash-out</dt>
              <dd className="font-semibold tabular-nums">{money(totalCashOut)}</dd>
            </div>
          </dl>
        )}
      </section>

      {selectedPlayers.length >= 2 && (
        <section className="surface space-y-3 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="section-header">Paid during the game</h2>
            <Button type="button" variant="outline" size="sm" onClick={addPayment} className="border-dashed">
              <Plus />
              Add payment
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Cash that already changed hands, like someone paying their loss before leaving. It is subtracted from the settlements.
          </p>
          {payments.length > 0 && (
            <ul className="space-y-2">
              {payments.map(entry => (
                <li key={entry.key} className="space-y-2 rounded-xl border border-border/60 bg-muted/40 p-3">
                  <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
                    <div className="min-w-0 space-y-1">
                      <span className="block text-[0.6875rem] font-medium uppercase tracking-[0.1em] text-muted-foreground">From</span>
                      <Select value={entry.from_player_id} onValueChange={v => updatePayment(entry.key, 'from_player_id', v)}>
                        <SelectTrigger className={fieldH} aria-label="Payer">
                          <SelectValue placeholder="Payer" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedPlayers.map(p => (
                            <SelectItem key={p.player_id} value={p.player_id}>
                              {getPlayerName(p.player_id)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <ArrowRight className="mb-3.5 h-4 w-4 shrink-0 text-gold" aria-hidden="true" />
                    <div className="min-w-0 space-y-1">
                      <span className="block text-[0.6875rem] font-medium uppercase tracking-[0.1em] text-muted-foreground">To</span>
                      <Select value={entry.to_player_id} onValueChange={v => updatePayment(entry.key, 'to_player_id', v)}>
                        <SelectTrigger className={fieldH} aria-label="Recipient">
                          <SelectValue placeholder="Recipient" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedPlayers
                            .filter(p => p.player_id !== entry.from_player_id)
                            .map(p => (
                              <SelectItem key={p.player_id} value={p.player_id}>
                                {getPlayerName(p.player_id)}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      placeholder={`Amount (${currency})`}
                      aria-label="Amount"
                      value={entry.amount}
                      onChange={e => updatePayment(entry.key, 'amount', e.target.value)}
                      className={cn(fieldH, 'flex-1 tabular-nums')}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removePayment(entry.key)}
                      aria-label="Remove payment"
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* Sticky action bar with a live explanation of what's missing */}
      <div
        className={cn(
          'sticky z-10 -mx-1 rounded-2xl border border-border/70 bg-[hsl(var(--popover)/0.92)] p-2.5 shadow-[0_16px_40px_-16px_hsl(0_0%_0%/0.95)] backdrop-blur-xl',
          inDialog ? 'bottom-0' : 'bottom-[calc(var(--tabbar-h)+env(safe-area-inset-bottom)+0.75rem)] md:bottom-4'
        )}
      >
        <p
          role="status"
          className={cn(
            'mb-2 flex items-center justify-center gap-1.5 text-[0.8125rem] font-medium',
            status.tone === 'good' ? 'text-success' : status.tone === 'bad' ? 'text-destructive' : 'text-muted-foreground'
          )}
        >
          {status.tone === 'good' ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : status.tone === 'bad' ? <AlertCircle className="h-4 w-4" aria-hidden="true" /> : null}
          <span className="tabular-nums">{status.text}</span>
        </p>
        <div className="flex gap-2">
          {onCancel && (
            <Button type="button" variant="secondary" size="lg" onClick={onCancel} className="flex-1">
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            size="lg"
            className="flex-[2]"
            disabled={submitting || selectedPlayers.length < 2 || !isBalanced}
          >
            {submitting && <Loader2 className="animate-spin" />}
            {existingSession ? 'Save changes' : 'Log session'}
          </Button>
        </div>
      </div>
    </form>
  );
}

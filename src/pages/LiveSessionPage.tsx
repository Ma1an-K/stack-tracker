import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { useAuthContext } from '@/contexts/AuthContext';
import { useLiveSession } from '@/contexts/LiveSessionContext';
import { usePlayers } from '@/hooks/usePlayers';
import { useIsMobile } from '@/hooks/use-mobile';
import { formatCurrency } from '@/lib/settlement';
import { cn } from '@/lib/utils';
import { Player, LiveSessionPlayer } from '@/types/database';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
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
import { Loader2, Plus, Minus, Trash2, Users, Clock, Flag, Radio, UserPlus, Play, ArrowLeft } from 'lucide-react';
import { LivePulse } from '@/components/sessions/LivePulse';

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
/* Setup — pick who's playing and the default buy-in                    */
/* ------------------------------------------------------------------ */

function SetupView({ players, onStart }: { players: Player[]; onStart: (p: LiveSessionPlayer[], d: number) => Promise<unknown> }) {
  const isMobile = useIsMobile();
  const [defaultBuyIn, setDefaultBuyIn] = useState('50');
  const [selected, setSelected] = useState<string[]>([]);
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

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="pb-3">
          <span className="section-header">Buy-in</span>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="default-buy-in" className="text-sm">Standard buy-in</Label>
          <Input
            id="default-buy-in"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={defaultBuyIn}
            onChange={e => setDefaultBuyIn(e.target.value)}
            className={cn('bg-muted/30', isMobile && 'h-10')}
          />
          <p className="text-xs text-muted-foreground">
            Everyone starts with this. Rebuys use it as the quick-tap amount.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <span className="section-header">Who's playing</span>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {players.map(p => {
              const on = selected.includes(p.id);
              return (
                <Button
                  key={p.id}
                  type="button"
                  variant={on ? 'default' : 'secondary'}
                  size="sm"
                  onClick={() => toggle(p.id)}
                  className={isMobile ? 'h-9' : 'h-8'}
                >
                  {on ? null : <Plus className="mr-1 h-3.5 w-3.5" />}
                  {p.name}
                </Button>
              );
            })}
          </div>
          {selected.length > 0 && (
            <p className="mt-3 text-xs text-muted-foreground">
              {selected.length} selected · {formatCurrency(selected.length * amount)} on the table to start
            </p>
          )}
        </CardContent>
      </Card>

      <Button className={cn('w-full', isMobile && 'h-11')} disabled={!canStart || starting} onClick={handleStart}>
        {starting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4 fill-current" />}
        Start Session
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tracker — the running game                                          */
/* ------------------------------------------------------------------ */

function TrackerView({ players }: { players: Player[] }) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { homegame } = useAuthContext();
  const { liveSession, totalPot, addBuyIn, setBuyIn, addPlayer, removePlayer } = useLiveSession();
  const elapsed = useElapsed(liveSession?.started_at);

  const [customFor, setCustomFor] = useState<Player | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [addOpen, setAddOpen] = useState(false);

  if (!liveSession) return null;

  const currency = homegame?.currency;
  const base = Number(liveSession.default_buy_in);
  const chips = [base, base * 2];
  const nameOf = (id: string) => players.find(p => p.id === id)?.name ?? 'Unknown';
  const seated = liveSession.players;
  const bench = players.filter(p => p.is_active && !seated.some(sp => sp.player_id === p.id));

  return (
    <div className="space-y-4">
      <Card className="border-gold/40">
        <CardContent className="py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <LivePulse />
                <span className="section-header">Live Session</span>
              </div>
              <div className="mt-1.5 flex items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{elapsed}</span>
                <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{seated.length}</span>
                <span>{format(parseISO(liveSession.started_at), 'h:mm a')}</span>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">On the table</div>
              <div className="text-2xl font-bold tabular-nums text-gold">{formatCurrency(totalPot, currency)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <span className="section-header">Buy-ins</span>
            {bench.length > 0 && (
              <Button variant="outline" size="sm" className="h-8 border-dashed" onClick={() => setAddOpen(true)}>
                <UserPlus className="mr-1 h-3.5 w-3.5" />
                Add Player
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {seated.map(sp => {
            const player = players.find(p => p.id === sp.player_id);
            return (
              <div key={sp.player_id} className="rounded-lg bg-muted/30 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium">{nameOf(sp.player_id)}</span>
                  <button
                    type="button"
                    className="text-lg font-bold tabular-nums text-gold"
                    onClick={() => { if (player) { setCustomFor(player); setCustomAmount(''); } }}
                  >
                    {formatCurrency(Number(sp.buy_in), currency)}
                  </button>
                </div>
                <div className="mt-2.5 flex items-center gap-1.5">
                  {chips.map(amt => (
                    <Button
                      key={amt}
                      variant="secondary"
                      size="sm"
                      className="h-9 flex-1 text-xs"
                      onClick={() => addBuyIn(sp.player_id, amt)}
                    >
                      <Plus className="mr-0.5 h-3 w-3" />
                      {amt}
                    </Button>
                  ))}
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-9 flex-1 text-xs"
                    onClick={() => { if (player) { setCustomFor(player); setCustomAmount(''); } }}
                  >
                    Other
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0 text-muted-foreground"
                    onClick={() => addBuyIn(sp.player_id, -base)}
                    disabled={Number(sp.buy_in) <= 0}
                    aria-label={`Remove ${base} from ${nameOf(sp.player_id)}`}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}

          <div className="flex items-center justify-between border-t border-border/50 pt-3">
            <span className="text-sm text-muted-foreground">Total on the table</span>
            <span className="font-semibold tabular-nums">{formatCurrency(totalPot, currency)}</span>
          </div>
        </CardContent>
      </Card>

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Radio className="h-3 w-3 text-success" />
        Every tap saves instantly — close the app and pick up where you left off.
      </p>

      <div className="pt-1">
        <Button
          className={cn('w-full', isMobile && 'h-11')}
          disabled={seated.length < 2}
          onClick={() => navigate('/new-session?from=live')}
        >
          <Flag className="mr-2 h-4 w-4" />
          End Session &amp; Cash Out
        </Button>
      </div>

      {/* Custom amount / set exact total */}
      <Dialog open={!!customFor} onOpenChange={o => !o && setCustomFor(null)}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>{customFor?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Amount</Label>
            <Input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={customAmount}
              onChange={e => setCustomAmount(e.target.value)}
              autoFocus
              className="h-11 text-lg"
            />
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              className="w-full"
              disabled={!customAmount}
              onClick={() => { if (customFor) addBuyIn(customFor.id, parseFloat(customAmount) || 0); setCustomFor(null); }}
            >
              Add to buy-in
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              disabled={!customAmount}
              onClick={() => { if (customFor) setBuyIn(customFor.id, parseFloat(customAmount) || 0); setCustomFor(null); }}
            >
              Set total to this
            </Button>
            {customFor && (
              <Button
                variant="ghost"
                className="w-full text-muted-foreground hover:text-destructive"
                onClick={() => { removePlayer(customFor.id); setCustomFor(null); }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Remove from session
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Late arrival */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add player</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">Joins with a {formatCurrency(base, currency)} buy-in — adjust after.</p>
          <div className="flex flex-wrap gap-2">
            {bench.map(p => (
              <Button
                key={p.id}
                variant="secondary"
                size="sm"
                className="h-9"
                onClick={() => { addPlayer(p.id, base); setAddOpen(false); }}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                {p.name}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function DiscardButton() {
  const navigate = useNavigate();
  const { finish } = useLiveSession();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-9 text-muted-foreground hover:text-destructive">
          <Trash2 className="mr-1.5 h-4 w-4" />
          Discard
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Discard live session?</AlertDialogTitle>
          <AlertDialogDescription>
            All buy-ins tracked so far will be thrown away. Nothing is logged to your history.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep playing</AlertDialogCancel>
          <AlertDialogAction
            onClick={async () => {
              const { error } = await finish();
              if (!error) navigate('/');
            }}
            className="bg-destructive hover:bg-destructive/90"
          >
            Discard
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function LiveSessionPage() {
  const navigate = useNavigate();
  const { homegame } = useAuthContext();
  const { liveSession, loading, start } = useLiveSession();
  const { players, activePlayers, loading: playersLoading } = usePlayers(homegame?.id);

  if (loading || playersLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="-ml-2 h-9 w-9 shrink-0"
          onClick={() => navigate(-1)}
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Radio className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">{liveSession ? 'Live Session' : 'Start Live Session'}</h1>
        {liveSession && (
          <div className="ml-auto">
            <DiscardButton />
          </div>
        )}
      </div>

      {liveSession ? (
        <TrackerView players={players} />
      ) : activePlayers.length < 2 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            You need at least 2 active players to start a session.
          </CardContent>
        </Card>
      ) : (
        <SetupView players={activePlayers} onStart={start} />
      )}
    </div>
  );
}

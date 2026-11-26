import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Plus, X } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import { useOneOffGame } from '@/contexts/OneOffGameContext';
import { localDate } from '@/lib/oneOff/localStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface StartGameDialogProps {
  mode: 'live' | 'totals' | null;
  onOpenChange: (open: boolean) => void;
}

/** Names, label, date, currency and (live only) the default buy-in, then start. */
export function StartGameDialog({ mode, onOpenChange }: StartGameDialogProps) {
  const navigate = useNavigate();
  const { homegame } = useAuthContext();
  const { start, dispatch } = useOneOffGame();
  const [names, setNames] = useState(['', '']);
  const [label, setLabel] = useState('');
  const [playedOn, setPlayedOn] = useState('');
  const [currency, setCurrency] = useState('');
  const [buyIn, setBuyIn] = useState('50');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mode) return;
    setNames(['', '']);
    setLabel('');
    setPlayedOn(localDate());
    setCurrency(homegame?.currency ?? '$');
    setBuyIn('50');
    setError(null);
  }, [mode, homegame?.currency]);

  const live = mode === 'live';
  const amount = parseFloat(buyIn);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mode) return;
    const typed = names.map(n => n.trim()).filter(n => n !== '');
    if (typed.length < 2) return setError('Add at least two players');
    if (live && !(amount > 0)) return setError('Enter a default buy-in above 0');
    if (!currency.trim()) return setError('Enter a currency symbol');
    const result = start({
      mode,
      names: typed,
      defaultBuyIn: live ? Math.round(amount * 100) / 100 : 0,
      label: label.trim(),
      currency: currency.trim(),
    });
    if (result.error) return setError(result.error);
    if (playedOn && playedOn !== localDate()) dispatch({ type: 'setMeta', patch: { played_on: playedOn } });
    onOpenChange(false);
    navigate(live ? '/one-off/live' : '/one-off/settle');
  };

  return (
    <Dialog open={mode !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{live ? 'Start live game' : 'Enter final totals'}</DialogTitle>
          <DialogDescription>
            {live ? 'Track buy-ins as you play, then settle up.' : 'Type in what everyone bought in and cashed out.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <fieldset className="space-y-2">
            <legend className="mb-2 text-[0.8125rem] font-medium text-secondary-foreground">Players</legend>
            {names.map((name, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  aria-label={`Player ${i + 1}`}
                  placeholder={`Player ${i + 1}`}
                  value={name}
                  maxLength={60}
                  onChange={e => setNames(prev => prev.map((n, j) => (j === i ? e.target.value : n)))}
                />
                {names.length > 2 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-muted-foreground"
                    onClick={() => setNames(prev => prev.filter((_, j) => j !== i))}
                    aria-label={`Remove player ${i + 1}`}
                  >
                    <X />
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-dashed"
              disabled={names.length >= 50}
              onClick={() => setNames(prev => [...prev, ''])}
            >
              <Plus />
              Add player
            </Button>
          </fieldset>

          <div className="space-y-1.5">
            <Label htmlFor="start-label">Label (optional)</Label>
            <Input id="start-label" placeholder="Dan's place" maxLength={80} value={label} onChange={e => setLabel(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="start-date">Date</Label>
              <Input id="start-date" type="date" value={playedOn} onChange={e => setPlayedOn(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="start-currency">Currency</Label>
              <Input id="start-currency" maxLength={8} value={currency} onChange={e => setCurrency(e.target.value)} />
            </div>
          </div>

          {live && (
            <div className="space-y-1.5">
              <Label htmlFor="start-buy-in">Default buy-in</Label>
              <Input
                id="start-buy-in"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={buyIn}
                onChange={e => setBuyIn(e.target.value)}
                className="tabular-nums"
              />
              <p className="text-xs text-muted-foreground">Everyone starts with this. Rebuys use it as the quick-tap amount.</p>
            </div>
          )}

          {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="submit" size="lg" className="w-full">
              <Play />
              {live ? 'Start game' : 'Continue'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

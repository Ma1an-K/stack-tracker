import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/settlement';
import type { Player } from '@/types/database';

interface AddPlayerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bench: Pick<Player, 'id' | 'name'>[];
  canCreate: boolean;
  ownerName: string | null;
  baseBuyIn: number;
  currency?: string;
  onSeat: (playerId: string) => Promise<unknown>;
  onCreate: (name: string) => Promise<{ error: unknown | null; player: Pick<Player, 'id' | 'name'> | null }>;
}

export function AddPlayerDialog({
  open,
  onOpenChange,
  bench,
  canCreate,
  ownerName,
  baseBuyIn,
  currency,
  onSeat,
  onCreate,
}: AddPlayerDialogProps) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setName('');
  }, [open]);

  const trimmed = name.trim();

  const seat = async (playerId: string) => {
    await onSeat(playerId);
    onOpenChange(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      const { error, player } = await onCreate(trimmed);
      if (error || !player) return;
      await onSeat(player.id);
      setName('');
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add player</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          {`Joins with a ${formatCurrency(baseBuyIn, currency)} buy-in — adjust after.`}
        </DialogDescription>
        {canCreate ? (
          <form onSubmit={submit} className="flex gap-2 border-b border-border/60 pb-4">
            <Input
              aria-label="New player"
              placeholder="New player"
              value={name}
              onChange={e => setName(e.target.value)}
            />
            <Button type="submit" className="shrink-0" disabled={!trimmed || busy}>
              Add &amp; seat
            </Button>
          </form>
        ) : (
          <p className="border-b border-border/60 pb-4 text-sm text-muted-foreground">
            {`Only the owner or an admin can create new players. Ask ${ownerName ?? 'the owner'} to make you an admin on the Members page.`}
          </p>
        )}
        {bench.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {bench.map(p => (
              <button
                key={p.id}
                type="button"
                className="pressable inline-flex h-11 items-center gap-1.5 rounded-full border border-border/80 bg-secondary/70 px-4 text-sm font-medium hover:border-gold/40 hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => seat(p.id)}
              >
                <Plus className="h-4 w-4 text-gold" aria-hidden="true" />
                {p.name}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Everyone's already seated</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

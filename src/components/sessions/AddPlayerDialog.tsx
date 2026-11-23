import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/settlement';
import type { Player } from '@/types/database';

interface AddPlayerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bench: Player[];
  canCreate: boolean;
  ownerName: string | null;
  baseBuyIn: number;
  currency?: string;
  onSeat: (playerId: string) => Promise<unknown>;
  onCreate: (name: string) => Promise<{ error: unknown | null; player: Player | null }>;
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
        <p className="text-xs text-muted-foreground">
          {`Joins with a ${formatCurrency(baseBuyIn, currency)} buy-in — adjust after.`}
        </p>
        {bench.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {bench.map(p => (
              <Button
                key={p.id}
                variant="secondary"
                size="sm"
                className="h-9"
                onClick={() => seat(p.id)}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                {p.name}
              </Button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Everyone's already seated</p>
        )}
        {canCreate ? (
          <form onSubmit={submit} className="flex gap-2 border-t border-border pt-3">
            <Input
              aria-label="New player"
              placeholder="New player"
              value={name}
              onChange={e => setName(e.target.value)}
            />
            <Button type="submit" disabled={!trimmed || busy}>
              Add &amp; seat
            </Button>
          </form>
        ) : (
          <p className="border-t border-border pt-3 text-xs text-muted-foreground">
            {`Only the owner or an admin can create new players. Ask ${ownerName ?? 'the owner'} to make you an admin on the Members page.`}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

import { useState } from 'react';
import { Player, SessionWithPlayers } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Loader2, Plus, Trash2, AlertCircle, CheckCircle2, UserPlus } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface PlayerEntry {
  player_id: string;
  buy_in: string;
  cash_out: string;
}

interface SessionFormProps {
  players: Player[];
  existingSession?: SessionWithPlayers;
  onSubmit: (
    date: string,
    players: { player_id: string; buy_in: number; cash_out: number }[],
    notes?: string
  ) => Promise<{ error: any }>;
  onCancel?: () => void;
  onAddPlayer?: (name: string) => Promise<{ error: any }>;
}

export function SessionForm({ players, existingSession, onSubmit, onCancel, onAddPlayer }: SessionFormProps) {
  const isMobile = useIsMobile();
  const [date, setDate] = useState(
    existingSession?.date || format(new Date(), 'yyyy-MM-dd')
  );
  const [notes, setNotes] = useState(existingSession?.notes || '');
  const [selectedPlayers, setSelectedPlayers] = useState<PlayerEntry[]>(
    existingSession?.session_players.map(sp => ({
      player_id: sp.player_id,
      buy_in: sp.buy_in.toString(),
      cash_out: sp.cash_out.toString(),
    })) || []
  );
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

    setSubmitting(true);
    const { error } = await onSubmit(
      date,
      selectedPlayers.map(p => ({
        player_id: p.player_id,
        buy_in: parseFloat(p.buy_in),
        cash_out: parseFloat(p.cash_out),
      })),
      notes || undefined
    );
    setSubmitting(false);

    if (!error && onCancel) {
      onCancel();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Card>
        <CardHeader className="pb-3">
          <span className="section-header">{existingSession ? 'Edit Session' : 'Session Details'}</span>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="date" className="text-sm">Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className={cn("bg-muted/30", isMobile && "h-10")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any notes about this session..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="bg-muted/30 resize-none"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <span className="section-header">Players</span>
        </CardHeader>
        <CardContent className="space-y-4">
          {availablePlayers.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Add Players</Label>
              <div className="flex flex-wrap gap-2">
                {availablePlayers.map((player) => (
                  <Button
                    key={player.id}
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => addPlayer(player.id)}
                    className={isMobile ? "h-9" : "h-8"}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    {player.name}
                  </Button>
                ))}
                {onAddPlayer && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddPlayer(!showAddPlayer)}
                    className={cn("border-dashed", isMobile ? "h-9" : "h-8")}
                  >
                    <UserPlus className="h-3.5 w-3.5 mr-1" />
                    New Player
                  </Button>
                )}
              </div>
            </div>
          )}

          {availablePlayers.length === 0 && onAddPlayer && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Add Players</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAddPlayer(!showAddPlayer)}
                className={cn("border-dashed", isMobile ? "h-9" : "h-8")}
              >
                <UserPlus className="h-3.5 w-3.5 mr-1" />
                New Player
              </Button>
            </div>
          )}

          {showAddPlayer && onAddPlayer && (
            <div className="flex gap-2 p-3 rounded-lg bg-muted/30 border border-dashed border-border">
              <Input
                placeholder="Player name"
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddNewPlayer())}
                className={cn("flex-1", isMobile ? "h-10" : "h-9")}
                autoFocus
              />
              <Button
                type="button"
                size="sm"
                onClick={handleAddNewPlayer}
                disabled={addingPlayer || !newPlayerName.trim()}
                className={isMobile ? "h-10" : "h-9"}
              >
                {addingPlayer ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Add'
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => { setShowAddPlayer(false); setNewPlayerName(''); }}
                className={isMobile ? "h-10" : "h-9"}
              >
                Cancel
              </Button>
            </div>
          )}

          {selectedPlayers.length === 0 ? (
            <p className="text-muted-foreground text-center py-6 text-sm">
              Select players to add to this session
            </p>
          ) : (
            <div className="space-y-2">
              {selectedPlayers.map((entry) => (
                <div
                  key={entry.player_id}
                  className="flex items-center gap-2 p-3 rounded-lg bg-muted/30"
                >
                  <span className="font-medium text-sm min-w-[70px] truncate">
                    {getPlayerName(entry.player_id)}
                  </span>
                  <div className="flex-1 flex gap-2">
                    <div className="flex-1">
                      <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">Buy-in</Label>
                      <Input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={entry.buy_in}
                        onChange={(e) =>
                          updatePlayer(entry.player_id, 'buy_in', e.target.value)
                        }
                        className={cn("bg-background/50", isMobile ? "h-10" : "h-9")}
                      />
                    </div>
                    <div className="flex-1">
                      <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">Cash-out</Label>
                      <Input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={entry.cash_out}
                        onChange={(e) =>
                          updatePlayer(entry.player_id, 'cash_out', e.target.value)
                        }
                        className={cn("bg-background/50", isMobile ? "h-10" : "h-9")}
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removePlayer(entry.player_id)}
                    className="text-muted-foreground hover:text-destructive h-8 w-8"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {selectedPlayers.length > 0 && (
            <div className="pt-4 border-t border-border/50 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Buy-in</span>
                <span className="font-medium tabular-nums">${totalBuyIn.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Cash-out</span>
                <span className="font-medium tabular-nums">${totalCashOut.toFixed(2)}</span>
              </div>
              {totalBuyIn > 0 && (
                <div className={`flex items-center gap-2 mt-3 text-sm ${isBalanced ? 'text-success' : 'text-destructive'}`}>
                  {isBalanced ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Balanced</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4" />
                      <span>
                        Difference: ${Math.abs(totalBuyIn - totalCashOut).toFixed(2)}
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        {onCancel && (
          <Button 
            type="button" 
            variant="secondary" 
            onClick={onCancel} 
            className={cn("flex-1", isMobile && "h-11")}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          className={cn("flex-1", isMobile && "h-11")}
          disabled={submitting || selectedPlayers.length < 2 || !isBalanced}
        >
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {existingSession ? 'Update Session' : 'Log Session'}
        </Button>
      </div>
    </form>
  );
}

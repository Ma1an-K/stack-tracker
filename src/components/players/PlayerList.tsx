import { useState } from 'react';
import { ActionError, Player } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { UserPlus, Trash2, Loader2, Users, UserCheck, Hand } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
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

interface PlayerListProps {
  players: Player[];
  loading: boolean;
  isOwner: boolean;
  currentUserId?: string;
  onAddPlayer: (name: string) => Promise<{ error: ActionError }>;
  onUpdatePlayer: (id: string, updates: Partial<Player>) => Promise<{ error: ActionError }>;
  onDeletePlayer: (id: string) => Promise<{ error: ActionError }>;
  onRequestClaim?: (playerId: string) => Promise<{ error: ActionError }>;
  hasRequestedPlayer?: (playerId: string) => boolean;
}

export function PlayerList({
  players,
  loading,
  isOwner,
  currentUserId,
  onAddPlayer,
  onUpdatePlayer,
  onDeletePlayer,
  onRequestClaim,
  hasRequestedPlayer,
}: PlayerListProps) {
  const [newPlayerName, setNewPlayerName] = useState('');
  const [adding, setAdding] = useState(false);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;

    setAdding(true);
    const { error } = await onAddPlayer(newPlayerName);
    setAdding(false);
    
    if (!error) {
      setNewPlayerName('');
    }
  };

  const handleRequestClaim = async (playerId: string) => {
    if (!onRequestClaim) return;
    setClaimingId(playerId);
    await onRequestClaim(playerId);
    setClaimingId(null);
  };

  const isMyPlayer = (player: Player) => player.user_id === currentUserId;
  // One player per account per homegame: once you hold a player here, or have a
  // claim waiting for approval, "This is me" is no longer offered on the others.
  const hasMyPlayer = !!currentUserId && players.some(isMyPlayer);
  const hasPendingClaim = !!hasRequestedPlayer && players.some((p) => hasRequestedPlayer(p.id));
  const canClaim = !!onRequestClaim && !hasMyPlayer && !hasPendingClaim;

  if (loading) {
    return (
      <div className="space-y-2" aria-busy="true" aria-label="Loading players">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {isOwner && (
        <Card>
          <CardHeader className="pb-3">
            <span className="section-header">Add a player</span>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddPlayer} className="flex gap-2">
              <Input
                placeholder="Player name"
                autoComplete="off"
                enterKeyHint="done"
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                aria-label="New player name"
                className="flex-1"
              />
              <Button type="submit" disabled={adding || !newPlayerName.trim()}>
                {adding ? <Loader2 className="animate-spin" /> : <UserPlus />}
                Add
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <span className="section-header">Roster</span>
            <span className="text-sm text-muted-foreground tabular-nums">{players.filter(p => p.is_active).length} active · {players.length}</span>
          </div>
        </CardHeader>
        <CardContent>
          {players.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-8 w-8 text-muted-foreground/50 mx-auto mb-3" aria-hidden="true" />
              <p className="text-muted-foreground text-sm">
                {isOwner ? 'No players yet. Add your first player above.' : 'No players yet.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {players.map((player) => (
                <div
                  key={player.id}
                  className="flex min-h-[60px] items-center justify-between gap-3 py-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={cn('truncate font-medium', !player.is_active && 'text-muted-foreground line-through decoration-muted-foreground/40')}>
                      {player.name}
                      {!player.is_active && <span className="sr-only"> (inactive)</span>}
                    </span>
                    {isMyPlayer(player) && (
                      <Badge className="shrink-0">
                        <UserCheck className="h-3 w-3 mr-1" />
                        You
                      </Badge>
                    )}
                    {player.user_id && !isMyPlayer(player) && (
                      <Badge variant="outline" className="shrink-0 text-muted-foreground">
                        <UserCheck className="h-3 w-3 mr-1" />
                        Claimed
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex shrink-0 items-center gap-1.5">
                    {/* Claim button for unclaimed players */}
                    {!player.user_id && onRequestClaim && (
                      hasRequestedPlayer?.(player.id) ? (
                        <Badge variant="outline" className="text-muted-foreground">
                          Pending
                        </Badge>
                      ) : !canClaim ? null : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRequestClaim(player.id)}
                          disabled={claimingId === player.id}
                        >
                          {claimingId === player.id ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                              <span className="sr-only">Sending claim</span>
                            </>
                          ) : (
                            <>
                              <Hand />
                              This is me
                            </>
                          )}
                        </Button>
                      )
                    )}
                    
                    {isOwner && (
                      <div className="flex min-h-[44px] items-center gap-2 px-1">
                        <Label htmlFor={`active-${player.id}`} className="hidden text-xs text-muted-foreground min-[400px]:block">
                          Active
                        </Label>
                        <Switch
                          id={`active-${player.id}`}
                          checked={player.is_active}
                          aria-label={`${player.name} is active`}
                          onCheckedChange={(checked) => 
                            onUpdatePlayer(player.id, { is_active: checked })
                          }
                        />
                      </div>
                    )}
                    
                    {isOwner && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label={`Delete ${player.name}`} className="text-muted-foreground hover:text-destructive">
                            <Trash2 />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete {player.name}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete {player.name}? This will fail if they have session history.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => onDeletePlayer(player.id)}
                              className="bg-destructive bg-none text-destructive-foreground shadow-none hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

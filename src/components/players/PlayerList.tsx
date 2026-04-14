import { useState } from 'react';
import { Player } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { UserPlus, Trash2, Loader2, Users, UserCheck, Hand } from 'lucide-react';
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
  onAddPlayer: (name: string) => Promise<{ error: any }>;
  onUpdatePlayer: (id: string, updates: Partial<Player>) => Promise<{ error: any }>;
  onDeletePlayer: (id: string) => Promise<{ error: any }>;
  onRequestClaim?: (playerId: string) => Promise<{ error: any }>;
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {isOwner && (
        <Card>
          <CardHeader className="pb-3">
            <span className="section-header">Add Player</span>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddPlayer} className="flex gap-2">
              <Input
                placeholder="Player name"
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                className="flex-1 bg-muted/30"
              />
              <Button type="submit" disabled={adding || !newPlayerName.trim()}>
                {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4 mr-1.5" />}
                Add
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <span className="section-header">Players</span>
            <span className="text-sm text-muted-foreground tabular-nums">{players.length}</span>
          </div>
        </CardHeader>
        <CardContent>
          {players.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-8 w-8 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">
                {isOwner ? 'No players yet. Add your first player above.' : 'No players yet.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {players.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between py-3 gap-3"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`font-medium text-sm ${!player.is_active ? 'text-muted-foreground' : ''}`}>
                      {player.name}
                    </span>
                    {isMyPlayer(player) && (
                      <Badge variant="secondary" className="text-xs">
                        <UserCheck className="h-3 w-3 mr-1" />
                        You
                      </Badge>
                    )}
                    {player.user_id && !isMyPlayer(player) && (
                      <Badge variant="outline" className="text-xs">
                        <UserCheck className="h-3 w-3 mr-1" />
                        Claimed
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {/* Claim button for unclaimed players */}
                    {!player.user_id && onRequestClaim && (
                      hasRequestedPlayer?.(player.id) ? (
                        <Badge variant="outline" className="text-xs">
                          Pending
                        </Badge>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRequestClaim(player.id)}
                          disabled={claimingId === player.id}
                        >
                          {claimingId === player.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Hand className="h-4 w-4 mr-1" />
                              Claim
                            </>
                          )}
                        </Button>
                      )
                    )}
                    
                    {isOwner && (
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`active-${player.id}`} className="text-xs text-muted-foreground">
                          Active
                        </Label>
                        <Switch
                          id={`active-${player.id}`}
                          checked={player.is_active}
                          onCheckedChange={(checked) => 
                            onUpdatePlayer(player.id, { is_active: checked })
                          }
                        />
                      </div>
                    )}
                    
                    {isOwner && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Player</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete {player.name}? This will fail if they have session history.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => onDeletePlayer(player.id)}
                              className="bg-destructive hover:bg-destructive/90"
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

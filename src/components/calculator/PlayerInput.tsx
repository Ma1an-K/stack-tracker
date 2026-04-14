import { Card } from '@/lib/poker/cards';
import { CardSlot, CardDisplay } from './CardDisplay';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

export interface PlayerData {
  id: string;
  name: string;
  holeCards: Card[];
  stackSize: number;
  isAllIn: boolean;
}

interface PlayerInputProps {
  player: PlayerData;
  index: number;
  usedCards: Card[];
  onUpdate: (player: PlayerData) => void;
  onRemove: () => void;
  canRemove: boolean;
  maxPerCard?: number;
}

export function PlayerInput({ 
  player, 
  index, 
  usedCards, 
  onUpdate, 
  onRemove, 
  canRemove,
  maxPerCard = 1,
}: PlayerInputProps) {
  const isMobile = useIsMobile();
  
  const addCard = (card: Card) => {
    onUpdate({ ...player, holeCards: [...player.holeCards, card] });
  };
  
  const removeCard = (cardIndex: number) => {
    const newCards = player.holeCards.filter((_, i) => i !== cardIndex);
    onUpdate({ ...player, holeCards: newCards });
  };
  
  return (
    <div className={cn(
      "rounded-lg bg-card border border-border",
      isMobile ? "p-3 space-y-2" : "p-4 space-y-3"
    )}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
            <User className="w-3.5 h-3.5 text-primary" />
          </div>
          <Input
            value={player.name}
            onChange={(e) => onUpdate({ ...player, name: e.target.value })}
            placeholder={`Player ${index + 1}`}
            className={cn(
              "max-w-[120px]",
              isMobile ? "h-8 text-sm" : "h-8"
            )}
          />
        </div>
        {canRemove && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onRemove}
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
      
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Hole Cards</Label>
        <div className="flex flex-wrap gap-1">
          {player.holeCards.map((card, i) => (
            <CardDisplay
              key={`${card}-${i}`}
              card={card}
              size="sm"
              onRemove={() => removeCard(i)}
            />
          ))}
          <CardSlot
            usedCards={[...usedCards, ...player.holeCards]}
            onSelect={addCard}
            onRemove={() => {}}
            placeholder="+"
            size="sm"
            maxPerCard={maxPerCard}
          />
        </div>
      </div>
      
      <div className={cn(
        "flex items-center gap-3",
        isMobile ? "flex-row" : "gap-4"
      )}>
        <div className="flex-1">
          <Label className="text-xs text-muted-foreground">Stack / Bet</Label>
          <Input
            type="number"
            inputMode="decimal"
            value={player.stackSize || ''}
            onChange={(e) => onUpdate({ ...player, stackSize: Number(e.target.value) || 0 })}
            placeholder="0"
            className="h-8"
          />
        </div>
        <div className="flex items-center gap-2 pt-4">
          <Label className="text-xs">All-in</Label>
          <Switch
            checked={player.isAllIn}
            onCheckedChange={(checked) => onUpdate({ ...player, isAllIn: checked })}
          />
        </div>
      </div>
    </div>
  );
}

interface PlayersListProps {
  players: PlayerData[];
  usedCards: Card[];
  onUpdate: (players: PlayerData[]) => void;
  maxPerCard?: number;
}

export function PlayersList({ players, usedCards, onUpdate, maxPerCard = 1 }: PlayersListProps) {
  const isMobile = useIsMobile();
  
  const addPlayer = () => {
    const newPlayer: PlayerData = {
      id: crypto.randomUUID(),
      name: `Player ${players.length + 1}`,
      holeCards: [],
      stackSize: 0,
      isAllIn: false,
    };
    onUpdate([...players, newPlayer]);
  };
  
  const updatePlayer = (index: number, player: PlayerData) => {
    const newPlayers = [...players];
    newPlayers[index] = player;
    onUpdate(newPlayers);
  };
  
  const removePlayer = (index: number) => {
    onUpdate(players.filter((_, i) => i !== index));
  };
  
  // Get cards used by other players for each player's picker
  const getUsedCardsExcluding = (playerIndex: number) => {
    const otherPlayerCards = players
      .filter((_, i) => i !== playerIndex)
      .flatMap(p => p.holeCards);
    return [...usedCards, ...otherPlayerCards];
  };
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Players</h3>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={addPlayer}
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Player
        </Button>
      </div>
      
      {/* 2 columns on larger screens, single on very small mobile */}
      <div className="grid gap-2 sm:grid-cols-2">
        {players.map((player, index) => (
          <PlayerInput
            key={player.id}
            player={player}
            index={index}
            usedCards={getUsedCardsExcluding(index)}
            onUpdate={(p) => updatePlayer(index, p)}
            onRemove={() => removePlayer(index)}
            canRemove={players.length > 2}
            maxPerCard={maxPerCard}
          />
        ))}
      </div>
    </div>
  );
}

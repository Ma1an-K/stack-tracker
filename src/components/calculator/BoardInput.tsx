import { Card } from '@/lib/poker/cards';
import { CardSlot, CardDisplay } from './CardDisplay';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

export interface BoardData {
  id: string;
  flop: (Card | undefined)[];
  turn?: Card;
  river?: Card;
  sharedFrom?: {
    boardId: string;
    street: 'flop' | 'turn';
  };
}

interface BoardInputProps {
  board: BoardData;
  boardIndex: number;
  allBoards: BoardData[];
  usedCards: Card[];
  onUpdate: (board: BoardData) => void;
  onRemove: () => void;
  canRemove: boolean;
  maxPerCard?: number;
}

export function BoardInput({
  board,
  boardIndex,
  allBoards,
  usedCards,
  onUpdate,
  onRemove,
  canRemove,
  maxPerCard = 1,
}: BoardInputProps) {
  const isMobile = useIsMobile();
  
  const updateFlop = (cardIndex: number, card: Card | undefined) => {
    const newFlop = [...board.flop];
    if (card) {
      newFlop[cardIndex] = card;
    } else {
      newFlop[cardIndex] = undefined;
    }
    onUpdate({ ...board, flop: newFlop });
  };
  
  const getUsedExcludingBoard = () => {
    // Cards used by every OTHER board (not this one)
    const otherBoardCards: Card[] = [];
    for (const b of allBoards) {
      if (b.id === board.id) continue;
      otherBoardCards.push(...(b.flop.filter(Boolean) as Card[]));
      if (b.turn) otherBoardCards.push(b.turn);
      if (b.river) otherBoardCards.push(b.river);
    }
    // usedCards here is player hole cards only; add other boards' cards on top
    return [...usedCards, ...otherBoardCards];
  };
  
  const cardsForPicker = getUsedExcludingBoard();
  
  return (
    <div className={cn(
      "rounded-lg bg-card border border-border",
      isMobile ? "p-3 space-y-2" : "p-4 space-y-3"
    )}>
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm">
          {boardIndex === 0 ? 'Board' : `Runout ${boardIndex + 1}`}
        </h4>
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
      
      {/* Flop */}
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Flop</Label>
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <CardSlot
              key={i}
              card={board.flop[i]}
              usedCards={cardsForPicker}
              onSelect={(card) => updateFlop(i, card)}
              onRemove={() => updateFlop(i, undefined)}
              size="md"
              maxPerCard={maxPerCard}
            />
          ))}
        </div>
      </div>
      
      {/* Turn and River */}
      <div className="flex gap-4">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Turn</Label>
          <CardSlot
            card={board.turn}
            usedCards={cardsForPicker}
            onSelect={(card) => onUpdate({ ...board, turn: card })}
            onRemove={() => onUpdate({ ...board, turn: undefined })}
            size="md"
            maxPerCard={maxPerCard}
          />
        </div>
        
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">River</Label>
          <CardSlot
            card={board.river}
            usedCards={cardsForPicker}
            onSelect={(card) => onUpdate({ ...board, river: card })}
            onRemove={() => onUpdate({ ...board, river: undefined })}
            size="md"
            maxPerCard={maxPerCard}
          />
        </div>
      </div>
    </div>
  );
}

interface BoardsListProps {
  boards: BoardData[];
  usedCards: Card[];
  onUpdate: (boards: BoardData[]) => void;
  maxPerCard?: number;
}

export function BoardsList({ boards, usedCards, onUpdate, maxPerCard = 1 }: BoardsListProps) {
  const isMobile = useIsMobile();
  
  const addBoard = () => {
    // Copy from first board's flop/turn if exists
    const firstBoard = boards[0];
    const newBoard: BoardData = {
      id: crypto.randomUUID(),
      flop: firstBoard?.flop ? [...firstBoard.flop] : [undefined, undefined, undefined],
      turn: firstBoard?.turn,
      river: undefined,
    };
    onUpdate([...boards, newBoard]);
  };
  
  const copyFromFirst = (boardIndex: number, street: 'flop' | 'turn' | 'all') => {
    const firstBoard = boards[0];
    if (!firstBoard) return;
    
    const newBoards = [...boards];
    const board = { ...newBoards[boardIndex] };
    
    if (street === 'flop' || street === 'all') {
      board.flop = [...firstBoard.flop];
    }
    if (street === 'turn' || street === 'all') {
      board.turn = firstBoard.turn;
    }
    
    newBoards[boardIndex] = board;
    onUpdate(newBoards);
  };
  
  const updateBoard = (index: number, board: BoardData) => {
    const newBoards = [...boards];
    newBoards[index] = board;
    onUpdate(newBoards);
  };
  
  const removeBoard = (index: number) => {
    onUpdate(boards.filter((_, i) => i !== index));
  };
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Community Cards</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={addBoard}
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Runout
        </Button>
      </div>

      {/* Grid layout */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {boards.map((board, index) => (
          <div key={board.id} className="space-y-1">
            <BoardInput
              board={board}
              boardIndex={index}
              allBoards={boards}
              usedCards={usedCards}
              onUpdate={(b) => updateBoard(index, b)}
              onRemove={() => removeBoard(index)}
              canRemove={boards.length > 1}
              maxPerCard={maxPerCard}
            />
            {index > 0 && boards[0] && (
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyFromFirst(index, 'flop')}
                  className="text-xs h-7 px-2"
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Copy Flop
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyFromFirst(index, 'turn')}
                  className="text-xs h-7 px-2"
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Copy Turn
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

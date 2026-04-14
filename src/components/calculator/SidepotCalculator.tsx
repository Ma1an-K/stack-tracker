import { useState } from 'react';
import { Card } from '@/lib/poker/cards';
import { GameMode } from '@/lib/poker/evaluator';
import { PlayersList, PlayerData } from './PlayerInput';
import { BoardsList, BoardData } from './BoardInput';
import { ResultsDisplay } from './ResultsDisplay';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Calculator, RotateCcw } from 'lucide-react';

function createInitialPlayers(): PlayerData[] {
  return [
    { id: crypto.randomUUID(), name: 'Player 1', holeCards: [], stackSize: 0, isAllIn: false },
    { id: crypto.randomUUID(), name: 'Player 2', holeCards: [], stackSize: 0, isAllIn: false },
  ];
}

function createInitialBoards(): BoardData[] {
  return [
    { id: crypto.randomUUID(), flop: [undefined, undefined, undefined], turn: undefined, river: undefined },
  ];
}

export function SidepotCalculator() {
  const [mode, setMode] = useState<GameMode>('holdem');
  const [players, setPlayers] = useState<PlayerData[]>(createInitialPlayers);
  const [boards, setBoards] = useState<BoardData[]>(createInitialBoards);
  const [doubleDeck, setDoubleDeck] = useState(false);
  
  const reset = () => {
    setPlayers(createInitialPlayers());
    setBoards(createInitialBoards());
  };
  
  // Collect all used cards for validation
  const getAllPlayerCards = (): Card[] => {
    return players.flatMap(p => p.holeCards);
  };
  
  const getAllBoardCards = (): Card[] => {
    const cards: Card[] = [];
    for (const board of boards) {
      cards.push(...(board.flop.filter(Boolean) as Card[]));
      if (board.turn) cards.push(board.turn);
      if (board.river) cards.push(board.river);
    }
    return cards;
  };
  
  const usedCardsForPlayers = getAllBoardCards();
  const usedCardsForBoards = getAllPlayerCards();
  
  const maxPerCard = doubleDeck ? 2 : 1;
  
  return (
    <div className="space-y-6">
      {/* Mode Selection */}
      <div className="flex items-center justify-between">
        <Tabs value={mode} onValueChange={(v) => setMode(v as GameMode)}>
          <TabsList>
            <TabsTrigger value="holdem">Texas Hold'em</TabsTrigger>
            <TabsTrigger value="omaha">Omaha</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="double-deck" className="text-xs text-muted-foreground whitespace-nowrap">2 Decks</Label>
            <Switch
              id="double-deck"
              checked={doubleDeck}
              onCheckedChange={setDoubleDeck}
            />
          </div>
          <Button variant="outline" size="sm" onClick={reset}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
        </div>
      </div>
      
      <div className="text-sm text-muted-foreground">
        {mode === 'holdem' 
          ? 'Use any number of hole cards. Best 5-card hand from any combination.'
          : 'Use any number of hole cards. Must use exactly 2 hole cards + 3 board cards.'}
        {doubleDeck && ' (2-deck mode: each card can appear up to twice)'}
      </div>
      
      {/* Input Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <PlayersList
            players={players}
            usedCards={usedCardsForPlayers}
            onUpdate={setPlayers}
            maxPerCard={maxPerCard}
          />
        </div>
        
        <div className="space-y-6">
          <BoardsList
            boards={boards}
            usedCards={usedCardsForBoards}
            onUpdate={setBoards}
            maxPerCard={maxPerCard}
          />
        </div>
      </div>
      
      {/* Results Section */}
      <div className="pt-4 border-t border-border">
        <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <Calculator className="w-5 h-5 text-primary" />
          Results
        </h2>
        <ResultsDisplay players={players} boards={boards} mode={mode} />
      </div>
    </div>
  );
}

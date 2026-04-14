import { Card } from '@/lib/poker/cards';
import { CardDisplay } from './CardDisplay';
import { PlayerData } from './PlayerInput';
import { BoardData } from './BoardInput';
import { determineWinners, evaluateBestHand, GameMode, PlayerResult, HAND_RANK_NAMES } from '@/lib/poker/evaluator';
import { calculateSidepots, Pot } from '@/lib/poker/sidepots';
import { Card as UICard, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Coins, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ResultsDisplayProps {
  players: PlayerData[];
  boards: BoardData[];
  mode: GameMode;
}

interface BoardResult {
  boardIndex: number;
  boardCards: Card[];
  playerResults: PlayerResult[];
}

export function ResultsDisplay({ players, boards, mode }: ResultsDisplayProps) {
  // Filter valid players (with hole cards)
  const validPlayers = players.filter(p => p.holeCards.length >= (mode === 'omaha' ? 4 : 1));
  
  if (validPlayers.length < 2) {
    return (
      <UICard>
        <CardContent className="py-8 text-center text-muted-foreground">
          Add at least 2 players with hole cards to see results
        </CardContent>
      </UICard>
    );
  }
  
  // Calculate sidepots
  const pots = calculateSidepots(
    validPlayers.map(p => ({
      playerId: p.id,
      playerName: p.name,
      stackSize: p.stackSize,
      isAllIn: p.isAllIn,
    }))
  );
  
  // Evaluate each board
  const boardResults: BoardResult[] = boards.map((board, index) => {
    const boardCards = [
      ...(board.flop.filter(Boolean) as Card[]),
      board.turn,
      board.river,
    ].filter(Boolean) as Card[];
    
    if (boardCards.length < 3) {
      return {
        boardIndex: index,
        boardCards,
        playerResults: validPlayers.map(p => ({
          playerId: p.id,
          hand: null,
          isWinner: false,
          isTied: false,
        })),
      };
    }
    
    const results = determineWinners(
      validPlayers.map(p => ({ id: p.id, holeCards: p.holeCards })),
      boardCards,
      mode
    );
    
    return {
      boardIndex: index,
      boardCards,
      playerResults: results,
    };
  });
  
  // Calculate final chip movements
  const chipMovements = calculateChipMovements(validPlayers, pots, boardResults, mode);
  
  return (
    <div className="space-y-4">
      {/* Pots Summary */}
      <UICard>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Coins className="w-4 h-4 text-primary" />
            Pot Structure
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {pots.map((pot, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
              <span className="text-sm font-medium">{pot.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {pot.eligiblePlayerIds.length} players
                </span>
                <Badge variant="secondary">{pot.amount}</Badge>
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between pt-2 font-semibold">
            <span>Total</span>
            <Badge variant="default" className="bg-primary">
              {pots.reduce((sum, p) => sum + p.amount, 0)}
            </Badge>
          </div>
        </CardContent>
      </UICard>
      
      {/* Results per Board */}
      {boardResults.map((result, boardIdx) => (
        <UICard key={boardIdx}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Trophy className="w-4 h-4 text-primary" />
              {boards.length === 1 ? 'Results' : `Runout ${boardIdx + 1}`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {result.boardCards.length < 3 ? (
              <p className="text-sm text-muted-foreground">
                Need at least a flop (3 cards) to evaluate
              </p>
            ) : (
              <div className="space-y-3">
                {/* Board Cards */}
                <div className="flex gap-1">
                  {result.boardCards.map((card, i) => (
                    <CardDisplay key={`${card}-${i}`} card={card} size="sm" />
                  ))}
                </div>
                
                {/* Player Results */}
                <div className="space-y-2">
                  {result.playerResults.map((pr) => {
                    const player = validPlayers.find(p => p.id === pr.playerId);
                    if (!player) return null;
                    
                    return (
                      <div
                        key={pr.playerId}
                        className={cn(
                          'flex items-center justify-between p-2 rounded-md',
                          pr.isWinner && 'bg-success/10 border border-success/30'
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {pr.isWinner && <Trophy className="w-4 h-4 text-success" />}
                          <span className="font-medium text-sm">{player.name}</span>
                          <div className="flex gap-0.5">
                            {player.holeCards.map((card, i) => (
                              <CardDisplay key={`${card}-${i}`} card={card} size="sm" />
                            ))}
                          </div>
                        </div>
                        <div className="text-right">
                          {pr.hand ? (
                            <>
                              <div className="text-sm font-medium">
                                {HAND_RANK_NAMES[pr.hand.handRank]}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {pr.hand.description}
                              </div>
                            </>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              Cannot evaluate
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </UICard>
      ))}
      
      {/* Final Chip Movements */}
      {Object.keys(chipMovements).length > 0 && (
        <UICard>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Final Chip Movements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {validPlayers.map(player => {
                const movement = Math.round(chipMovements[player.id] || 0);
                const net = movement - player.stackSize;
                
                return (
                  <div key={player.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                    <span className="font-medium">{player.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        Invested: {player.stackSize}
                      </span>
                      <span className="text-sm text-muted-foreground">→</span>
                      <span className="text-sm">
                        Won: {movement}
                      </span>
                      <Badge
                        variant={net > 0 ? 'default' : net < 0 ? 'destructive' : 'secondary'}
                        className={cn(
                          'min-w-[60px] justify-center',
                          net > 0 && 'bg-success hover:bg-success/90'
                        )}
                      >
                        {net > 0 && <TrendingUp className="w-3 h-3 mr-1" />}
                        {net < 0 && <TrendingDown className="w-3 h-3 mr-1" />}
                        {net === 0 && <Minus className="w-3 h-3 mr-1" />}
                        {net > 0 ? '+' : ''}{net}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </UICard>
      )}
    </div>
  );
}

function calculateChipMovements(
  players: PlayerData[],
  pots: Pot[],
  boardResults: BoardResult[],
  mode: GameMode
): Record<string, number> {
  const movements: Record<string, number> = {};
  
  // Initialize all players with 0
  for (const player of players) {
    movements[player.id] = 0;
  }
  
  // If no valid board results, return empty
  const validResults = boardResults.filter(r => r.boardCards.length >= 3);
  if (validResults.length === 0) return movements;
  
  // Split each pot among boards
  const numBoards = validResults.length;
  
  for (const boardResult of validResults) {
    for (const pot of pots) {
      const potAmountForBoard = pot.amount / numBoards;
      
      // For each pot, we need to find the winner among ONLY the eligible players
      const eligiblePlayers = players.filter(p => pot.eligiblePlayerIds.includes(p.id));
      
      if (eligiblePlayers.length === 0) continue;
      
      // If only one player is eligible, they get the pot (uncontested)
      if (eligiblePlayers.length === 1) {
        movements[eligiblePlayers[0].id] += potAmountForBoard;
        continue;
      }
      
      // Evaluate hands for eligible players only and find winner(s)
      const eligibleResults = eligiblePlayers.map(player => {
        const hand = evaluateBestHand(player.holeCards, boardResult.boardCards, mode);
        return { playerId: player.id, hand };
      }).filter(r => r.hand !== null);
      
      if (eligibleResults.length === 0) continue;
      
      // Sort by hand strength and find best
      eligibleResults.sort((a, b) => {
        const aVal = a.hand!.rankValue;
        const bVal = b.hand!.rankValue;
        if (aVal !== bVal) return bVal - aVal;
        
        // Compare tiebreakers
        for (let i = 0; i < Math.max(a.hand!.tiebreakers.length, b.hand!.tiebreakers.length); i++) {
          const aT = a.hand!.tiebreakers[i] || 0;
          const bT = b.hand!.tiebreakers[i] || 0;
          if (aT !== bT) return bT - aT;
        }
        return 0;
      });
      
      // Find all players tied with the best hand
      const bestHand = eligibleResults[0].hand!;
      const winners = eligibleResults.filter(r => {
        if (r.hand!.rankValue !== bestHand.rankValue) return false;
        for (let i = 0; i < Math.max(r.hand!.tiebreakers.length, bestHand.tiebreakers.length); i++) {
          const rT = r.hand!.tiebreakers[i] || 0;
          const bT = bestHand.tiebreakers[i] || 0;
          if (rT !== bT) return false;
        }
        return true;
      });
      
      // Split pot among winners
      const amountPerWinner = potAmountForBoard / winners.length;
      for (const winner of winners) {
        movements[winner.playerId] += amountPerWinner;
      }
    }
  }
  
  return movements;
}

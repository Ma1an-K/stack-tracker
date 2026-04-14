// Poker hand evaluator for Texas Hold'em and Omaha
import { Card, Rank, RANK_VALUES } from './cards';

export type HandRank = 
  | 'high-card'
  | 'pair'
  | 'two-pair'
  | 'three-of-a-kind'
  | 'straight'
  | 'flush'
  | 'full-house'
  | 'four-of-a-kind'
  | 'straight-flush'
  | 'royal-flush';

export const HAND_RANK_VALUES: Record<HandRank, number> = {
  'high-card': 1,
  'pair': 2,
  'two-pair': 3,
  'three-of-a-kind': 4,
  'straight': 5,
  'flush': 6,
  'full-house': 7,
  'four-of-a-kind': 8,
  'straight-flush': 9,
  'royal-flush': 10,
};

export const HAND_RANK_NAMES: Record<HandRank, string> = {
  'high-card': 'High Card',
  'pair': 'Pair',
  'two-pair': 'Two Pair',
  'three-of-a-kind': 'Three of a Kind',
  'straight': 'Straight',
  'flush': 'Flush',
  'full-house': 'Full House',
  'four-of-a-kind': 'Four of a Kind',
  'straight-flush': 'Straight Flush',
  'royal-flush': 'Royal Flush',
};

export interface EvaluatedHand {
  handRank: HandRank;
  rankValue: number;
  tiebreakers: number[];
  bestFive: Card[];
  description: string;
}

function getRank(card: Card): Rank {
  return card[0] as Rank;
}

function getSuit(card: Card): string {
  return card[1];
}

function getRankValue(card: Card): number {
  return RANK_VALUES[getRank(card)];
}

function combinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  
  const result: T[][] = [];
  const first = arr[0];
  const rest = arr.slice(1);
  
  // Combinations including first element
  for (const combo of combinations(rest, k - 1)) {
    result.push([first, ...combo]);
  }
  
  // Combinations without first element
  for (const combo of combinations(rest, k)) {
    result.push(combo);
  }
  
  return result;
}

function evaluateFiveCardHand(cards: Card[]): EvaluatedHand {
  if (cards.length !== 5) {
    throw new Error('Must evaluate exactly 5 cards');
  }
  
  const sorted = [...cards].sort((a, b) => getRankValue(b) - getRankValue(a));
  const ranks = sorted.map(c => getRankValue(c));
  const suits = sorted.map(c => getSuit(c));
  
  const isFlush = suits.every(s => s === suits[0]);
  
  // Check for straight (including A-5 low straight)
  let isStraight = false;
  let straightHighCard = ranks[0];
  
  // Regular straight check
  if (ranks[0] - ranks[4] === 4 && new Set(ranks).size === 5) {
    isStraight = true;
  }
  
  // Wheel (A-5) straight
  if (ranks[0] === 14 && ranks[1] === 5 && ranks[2] === 4 && ranks[3] === 3 && ranks[4] === 2) {
    isStraight = true;
    straightHighCard = 5; // Ace is low in this case
  }
  
  // Count rank occurrences
  const rankCounts = new Map<number, number>();
  for (const rank of ranks) {
    rankCounts.set(rank, (rankCounts.get(rank) || 0) + 1);
  }
  
  const counts = Array.from(rankCounts.entries())
    .sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  
  // Determine hand type
  if (isFlush && isStraight) {
    if (straightHighCard === 14) {
      return {
        handRank: 'royal-flush',
        rankValue: 10,
        tiebreakers: [14],
        bestFive: sorted,
        description: 'Royal Flush',
      };
    }
    return {
      handRank: 'straight-flush',
      rankValue: 9,
      tiebreakers: [straightHighCard],
      bestFive: sorted,
      description: `Straight Flush, ${formatRankName(straightHighCard)} high`,
    };
  }
  
  if (counts[0][1] === 4) {
    return {
      handRank: 'four-of-a-kind',
      rankValue: 8,
      tiebreakers: [counts[0][0], counts[1][0]],
      bestFive: sorted,
      description: `Four of a Kind, ${formatRankName(counts[0][0])}s`,
    };
  }
  
  if (counts[0][1] === 3 && counts[1][1] === 2) {
    return {
      handRank: 'full-house',
      rankValue: 7,
      tiebreakers: [counts[0][0], counts[1][0]],
      bestFive: sorted,
      description: `Full House, ${formatRankName(counts[0][0])}s full of ${formatRankName(counts[1][0])}s`,
    };
  }
  
  if (isFlush) {
    return {
      handRank: 'flush',
      rankValue: 6,
      tiebreakers: ranks,
      bestFive: sorted,
      description: `Flush, ${formatRankName(ranks[0])} high`,
    };
  }
  
  if (isStraight) {
    return {
      handRank: 'straight',
      rankValue: 5,
      tiebreakers: [straightHighCard],
      bestFive: sorted,
      description: `Straight, ${formatRankName(straightHighCard)} high`,
    };
  }
  
  if (counts[0][1] === 3) {
    const kickers = counts.slice(1).map(c => c[0]);
    return {
      handRank: 'three-of-a-kind',
      rankValue: 4,
      tiebreakers: [counts[0][0], ...kickers],
      bestFive: sorted,
      description: `Three of a Kind, ${formatRankName(counts[0][0])}s`,
    };
  }
  
  if (counts[0][1] === 2 && counts[1][1] === 2) {
    const kicker = counts[2][0];
    return {
      handRank: 'two-pair',
      rankValue: 3,
      tiebreakers: [counts[0][0], counts[1][0], kicker],
      bestFive: sorted,
      description: `Two Pair, ${formatRankName(counts[0][0])}s and ${formatRankName(counts[1][0])}s`,
    };
  }
  
  if (counts[0][1] === 2) {
    const kickers = counts.slice(1).map(c => c[0]);
    return {
      handRank: 'pair',
      rankValue: 2,
      tiebreakers: [counts[0][0], ...kickers],
      bestFive: sorted,
      description: `Pair of ${formatRankName(counts[0][0])}s`,
    };
  }
  
  return {
    handRank: 'high-card',
    rankValue: 1,
    tiebreakers: ranks,
    bestFive: sorted,
    description: `${formatRankName(ranks[0])} High`,
  };
}

function formatRankName(value: number): string {
  const names: Record<number, string> = {
    14: 'Ace', 13: 'King', 12: 'Queen', 11: 'Jack', 10: 'Ten',
    9: 'Nine', 8: 'Eight', 7: 'Seven', 6: 'Six', 5: 'Five',
    4: 'Four', 3: 'Three', 2: 'Two',
  };
  return names[value] || String(value);
}

function compareHands(a: EvaluatedHand, b: EvaluatedHand): number {
  if (a.rankValue !== b.rankValue) {
    return b.rankValue - a.rankValue;
  }
  
  for (let i = 0; i < Math.max(a.tiebreakers.length, b.tiebreakers.length); i++) {
    const aVal = a.tiebreakers[i] || 0;
    const bVal = b.tiebreakers[i] || 0;
    if (aVal !== bVal) {
      return bVal - aVal;
    }
  }
  
  return 0;
}

export type GameMode = 'holdem' | 'omaha';

export function evaluateBestHand(
  holeCards: Card[],
  boardCards: Card[],
  mode: GameMode
): EvaluatedHand | null {
  if (boardCards.length < 3) return null;
  
  let bestHand: EvaluatedHand | null = null;
  
  if (mode === 'holdem') {
    // In Hold'em, use any combination of hole cards and board
    const allCards = [...holeCards, ...boardCards];
    const fiveCardCombos = combinations(allCards, 5);
    
    for (const combo of fiveCardCombos) {
      const evaluated = evaluateFiveCardHand(combo);
      if (!bestHand || compareHands(evaluated, bestHand) < 0) {
        bestHand = evaluated;
      }
    }
  } else {
    // In Omaha, must use exactly 2 hole cards and 3 board cards
    if (holeCards.length < 2) return null;
    
    const holeCombos = combinations(holeCards, 2);
    const boardCombos = combinations(boardCards, 3);
    
    for (const holeCombo of holeCombos) {
      for (const boardCombo of boardCombos) {
        const fiveCards = [...holeCombo, ...boardCombo];
        const evaluated = evaluateFiveCardHand(fiveCards);
        if (!bestHand || compareHands(evaluated, bestHand) < 0) {
          bestHand = evaluated;
        }
      }
    }
  }
  
  return bestHand;
}

export interface PlayerResult {
  playerId: string;
  hand: EvaluatedHand | null;
  isWinner: boolean;
  isTied: boolean;
}

export function determineWinners(
  players: { id: string; holeCards: Card[] }[],
  boardCards: Card[],
  mode: GameMode
): PlayerResult[] {
  const results: PlayerResult[] = players.map(player => ({
    playerId: player.id,
    hand: evaluateBestHand(player.holeCards, boardCards, mode),
    isWinner: false,
    isTied: false,
  }));
  
  // Filter out players who couldn't form a hand
  const validResults = results.filter(r => r.hand !== null);
  
  if (validResults.length === 0) return results;
  
  // Sort by hand strength
  validResults.sort((a, b) => compareHands(a.hand!, b.hand!));
  
  // Find all players tied with the best hand
  const bestHand = validResults[0].hand!;
  const winners = validResults.filter(r => compareHands(r.hand!, bestHand) === 0);
  
  for (const winner of winners) {
    winner.isWinner = true;
    winner.isTied = winners.length > 1;
  }
  
  return results;
}

// Card representation and utilities

export const SUITS = ['h', 'd', 'c', 's'] as const;
export const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'] as const;

export type Suit = typeof SUITS[number];
export type Rank = typeof RANKS[number];
export type Card = `${Rank}${Suit}`;

export const SUIT_SYMBOLS: Record<Suit, string> = {
  h: '♥',
  d: '♦',
  c: '♣',
  s: '♠',
};

export const SUIT_COLORS: Record<Suit, string> = {
  h: 'text-red-500',
  d: 'text-blue-400',
  c: 'text-green-500',
  s: 'text-slate-700',
};

export const RANK_VALUES: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
  'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14,
};

export function parseCard(cardStr: string): Card | null {
  const normalized = cardStr.toUpperCase().replace('10', 'T');
  if (normalized.length !== 2) return null;
  
  const rank = normalized[0] as Rank;
  const suit = normalized[1].toLowerCase() as Suit;
  
  if (!RANKS.includes(rank) || !SUITS.includes(suit)) return null;
  
  return `${rank}${suit}` as Card;
}

export function formatCard(card: Card): { rank: string; suit: string; suitSymbol: string; colorClass: string } {
  const rank = card[0] as Rank;
  const suit = card[1] as Suit;
  
  return {
    rank: rank === 'T' ? '10' : rank,
    suit,
    suitSymbol: SUIT_SYMBOLS[suit],
    colorClass: SUIT_COLORS[suit],
  };
}

export function getAllCards(): Card[] {
  const cards: Card[] = [];
  for (const rank of RANKS) {
    for (const suit of SUITS) {
      cards.push(`${rank}${suit}` as Card);
    }
  }
  return cards;
}

export function getAvailableCards(usedCards: Card[]): Card[] {
  const used = new Set(usedCards);
  return getAllCards().filter(card => !used.has(card));
}

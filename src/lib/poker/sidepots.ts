// Sidepot calculation logic

export interface PlayerStack {
  playerId: string;
  playerName: string;
  stackSize: number;
  isAllIn: boolean;
}

export interface Pot {
  amount: number;
  eligiblePlayerIds: string[];
  name: string;
}

export function calculateSidepots(players: PlayerStack[]): Pot[] {
  const totalPot = players.reduce((sum, p) => sum + p.stackSize, 0);

  if (totalPot === 0) {
    return [{
      amount: 0,
      eligiblePlayerIds: players.map(p => p.playerId),
      name: 'Main Pot',
    }];
  }

  // Build levels from ALL players' commitment amounts (not just all-in players).
  // A non-all-in player with a smaller stack than an all-in player still caps
  // their eligibility at their own commitment level.
  const levels = [...new Set(players.map(p => p.stackSize))]
    .filter(l => l > 0)
    .sort((a, b) => a - b);

  // Single commitment level — everyone put in the same amount, one main pot
  if (levels.length === 1) {
    return [{
      amount: totalPot,
      eligiblePlayerIds: players.map(p => p.playerId),
      name: 'Main Pot',
    }];
  }

  const pots: Pot[] = [];
  let previousLevel = 0;

  for (const level of levels) {
    const increment = level - previousLevel;
    if (increment <= 0) continue;

    // Eligible players are those who committed at least this much
    const eligible = players.filter(p => p.stackSize >= level);
    const potAmount = increment * eligible.length;

    if (potAmount > 0) {
      pots.push({
        amount: potAmount,
        eligiblePlayerIds: eligible.map(p => p.playerId),
        name: pots.length === 0 ? 'Main Pot' : `Side Pot ${pots.length}`,
      });
    }

    previousLevel = level;
  }

  return pots;
}

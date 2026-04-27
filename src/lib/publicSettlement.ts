export interface SettlementInputPlayer {
  id: string;
  name: string;
  buyIn: number;
  cashOut: number;
}

export interface SettlementTransfer {
  fromName: string;
  toName: string;
  amount: number;
}

export interface PlayerResult {
  id: string;
  name: string;
  buyIn: number;
  cashOut: number;
  profit: number;
}

export interface SettlementOutput {
  results: PlayerResult[];
  transfers: SettlementTransfer[];
  totalBuyIn: number;
  totalCashOut: number;
  imbalance: number;
}

export function computePublicSettlement(players: SettlementInputPlayer[]): SettlementOutput {
  const results: PlayerResult[] = players.map(p => ({
    id: p.id,
    name: p.name.trim() || 'Player',
    buyIn: p.buyIn,
    cashOut: p.cashOut,
    profit: p.cashOut - p.buyIn,
  }));

  const totalBuyIn = results.reduce((s, r) => s + r.buyIn, 0);
  const totalCashOut = results.reduce((s, r) => s + r.cashOut, 0);
  const imbalance = totalCashOut - totalBuyIn;

  const winners = results
    .filter(r => r.profit > 0.005)
    .map(r => ({ name: r.name, remaining: r.profit }))
    .sort((a, b) => b.remaining - a.remaining);

  const losers = results
    .filter(r => r.profit < -0.005)
    .map(r => ({ name: r.name, remaining: -r.profit }))
    .sort((a, b) => b.remaining - a.remaining);

  const transfers: SettlementTransfer[] = [];
  let i = 0;
  let j = 0;
  while (i < losers.length && j < winners.length) {
    const loser = losers[i];
    const winner = winners[j];
    const amount = Math.min(loser.remaining, winner.remaining);
    if (amount > 0.005) {
      transfers.push({
        fromName: loser.name,
        toName: winner.name,
        amount: Math.round(amount * 100) / 100,
      });
    }
    loser.remaining -= amount;
    winner.remaining -= amount;
    if (loser.remaining < 0.005) i++;
    if (winner.remaining < 0.005) j++;
  }

  return { results, transfers, totalBuyIn, totalCashOut, imbalance };
}

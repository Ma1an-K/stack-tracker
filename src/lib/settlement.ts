import { Player, SessionPlayerWithDetails, Settlement } from '@/types/database';

interface PlayerBalance {
  player: Player;
  balance: number; // positive = owes money, negative = owed money
}

export function calculateSettlements(sessionPlayers: SessionPlayerWithDetails[]): Settlement[] {
  // Calculate each player's balance (buy_in - cash_out = how much they're down)
  // If positive, they lost money and are owed
  // If negative, they won money and owe others
  const balances: PlayerBalance[] = sessionPlayers.map(sp => ({
    player: sp.player,
    balance: Number(sp.buy_in) - Number(sp.cash_out),
  }));

  // Separate into debtors (those who need to pay) and creditors (those who need to receive)
  const debtors = balances
    .filter(b => b.balance < 0) // Won money, needs to receive
    .sort((a, b) => a.balance - b.balance); // Sort by how much they're owed (most first)
  
  const creditors = balances
    .filter(b => b.balance > 0) // Lost money, needs to pay
    .sort((a, b) => b.balance - a.balance); // Sort by how much they owe (most first)

  const settlements: Settlement[] = [];
  
  let i = 0; // creditor index
  let j = 0; // debtor index
  
  // Create a copy of balances to modify
  const creditorBalances = creditors.map(c => ({ ...c }));
  const debtorBalances = debtors.map(d => ({ ...d, balance: Math.abs(d.balance) }));

  while (i < creditorBalances.length && j < debtorBalances.length) {
    const creditor = creditorBalances[i];
    const debtor = debtorBalances[j];
    
    const amount = Math.min(creditor.balance, debtor.balance);
    
    if (amount > 0.01) { // Only create settlement if meaningful amount
      settlements.push({
        from: creditor.player,
        to: debtor.player,
        amount: Math.round(amount * 100) / 100,
      });
    }
    
    creditor.balance -= amount;
    debtor.balance -= amount;
    
    if (creditor.balance < 0.01) i++;
    if (debtor.balance < 0.01) j++;
  }

  return settlements;
}

export function formatCurrency(amount: number, currency: string = '$'): string {
  const formatted = Math.abs(amount).toFixed(2);
  return `${currency}${formatted}`;
}

export function formatProfit(amount: number, currency: string = '$'): string {
  const prefix = amount >= 0 ? '+' : '-';
  return `${prefix}${currency}${Math.abs(amount).toFixed(2)}`;
}

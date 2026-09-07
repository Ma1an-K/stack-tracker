import { Player, SessionPaymentInput, SessionPlayerWithDetails, Settlement } from '@/types/database';

interface PlayerBalance {
  player: Player;
  balance: number; // positive = owes money, negative = owed money
}

/**
 * Compute who pays whom after the game.
 *
 * `payments` are transfers that already happened during the game (e.g. an
 * early leaver paying their loss in cash). Each one reduces the payer's
 * outstanding debt and the payee's outstanding credit before pairing.
 * Payments involving a player who isn't in the session are ignored.
 */
export function calculateSettlements(
  sessionPlayers: SessionPlayerWithDetails[],
  payments: SessionPaymentInput[] = []
): Settlement[] {
  // balance = buy_in - cash_out: positive means they lost and owe, negative means they won and are owed.
  const byId = new Map<string, PlayerBalance>();
  for (const sp of sessionPlayers) {
    byId.set(sp.player_id, {
      player: sp.player,
      balance: Number(sp.buy_in) - Number(sp.cash_out),
    });
  }

  for (const p of payments) {
    const from = byId.get(p.from_player_id);
    const to = byId.get(p.to_player_id);
    if (!from || !to) continue;
    const amount = Number(p.amount);
    from.balance -= amount; // paid, so owes less
    to.balance += amount;   // received, so is owed less
  }

  const balances = Array.from(byId.values());

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

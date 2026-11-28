import { mapTransfers, settle, summaryOf, type SettlementResultOf } from '@/lib/settlement/settle';

/** One row of the public calculator. */
export interface CalculatorRow {
  id: string;
  name: string;
  buyIn: number;
  cashOut: number;
}

export interface CalculatorTransfer {
  fromName: string;
  toName: string;
  amount: number;
}

export interface CalculatorPlayer {
  id: string;
  name: string;
  profit: number;
}

/** Every row's Profit comes too whenever the module gives Profits, even on a refusal; otherwise none. */
export type CalculatorSettlement = SettlementResultOf<CalculatorTransfer> & { players: CalculatorPlayer[] };

/** The Settlement module, in the calculator's shape: rows in, row names out. */
export function settleCalculatorRows(rows: CalculatorRow[]): CalculatorSettlement {
  const result = settle({ players: rows.map(r => ({ id: r.id, buyIn: r.buyIn, cashOut: r.cashOut })) });
  const names = new Map(rows.map(r => [r.id, rowName(r)]));
  const profits = summaryOf(result)?.profits;
  return {
    ...mapTransfers(result, t => ({ fromName: names.get(t.fromId)!, toName: names.get(t.toId)!, amount: t.amount })),
    players: profits ? rows.map(r => ({ id: r.id, name: names.get(r.id)!, profit: profits.get(r.id)! })) : [],
  };
}

const rowName = (row: CalculatorRow) => row.name.trim() || 'Player';

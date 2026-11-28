import { settle, type Refused, type Settled } from '@/lib/settlement/settle';

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

export type CalculatorSettlement =
  | Refused
  | (Omit<Settled, 'transfers'> & { transfers: CalculatorTransfer[]; players: CalculatorPlayer[] });

/** The Settlement module, in the calculator's shape: rows in, row names out. */
export function settleCalculatorRows(rows: CalculatorRow[]): CalculatorSettlement {
  const result = settle({ players: rows.map(r => ({ id: r.id, buyIn: r.buyIn, cashOut: r.cashOut })) });
  if (result.status === 'refused') return result;
  const names = new Map(rows.map(r => [r.id, rowName(r)]));
  return {
    ...result,
    players: rows.map(r => ({ id: r.id, name: names.get(r.id)!, profit: result.profits.get(r.id)! })),
    transfers: result.transfers.map(t => ({ fromName: names.get(t.fromId)!, toName: names.get(t.toId)!, amount: t.amount })),
  };
}

const rowName = (row: CalculatorRow) => row.name.trim() || 'Player';

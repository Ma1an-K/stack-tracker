import { describe, it, expect } from 'vitest';
import { settleCalculatorRows, type CalculatorRow } from './settle';

const row = (id: string, name: string, buyIn: number, cashOut: number): CalculatorRow => ({ id, name, buyIn, cashOut });

const settled = (rows: CalculatorRow[]) => {
  const result = settleCalculatorRows(rows);
  if (result.status !== 'settled') throw new Error(`refused: ${JSON.stringify(result.reason)}`);
  return result;
};

describe('settleCalculatorRows', () => {
  it('names each Transfer by its rows', () => {
    const result = settled([row('1', 'Ann', 100, 50), row('2', 'Ben', 100, 130), row('3', 'Cal', 100, 120)]);
    expect(result.transfers).toEqual([
      { fromName: 'Ann', toName: 'Ben', amount: 30 },
      { fromName: 'Ann', toName: 'Cal', amount: 20 },
    ]);
  });

  it('names a blank row "Player"', () => {
    const result = settled([row('1', '  ', 100, 40), row('2', 'Ben', 100, 160)]);
    expect(result.transfers).toEqual([{ fromName: 'Player', toName: 'Ben', amount: 60 }]);
  });

  it('gives each row its Profit by name, keeping an all-zero row at 0 with no Transfer', () => {
    const result = settled([row('1', 'Ann', 50, 0), row('2', 'Zed', 0, 0), row('3', 'Ben', 20, 70)]);
    expect(result.players).toEqual([
      { id: '1', name: 'Ann', profit: -50 },
      { id: '2', name: 'Zed', profit: 0 },
      { id: '3', name: 'Ben', profit: 50 },
    ]);
    expect(result.transfers).toEqual([{ fromName: 'Ann', toName: 'Ben', amount: 50 }]);
  });

  it('refuses unbalanced rows with the signed difference, and settles once they balance', () => {
    expect(settleCalculatorRows([row('1', 'Ann', 100, 0), row('2', 'Ben', 100, 150)])).toEqual({
      status: 'refused',
      reason: { rule: 'unbalanced', difference: -50 },
    });
    expect(settleCalculatorRows([row('1', 'Ann', 100, 0.01), row('2', 'Ben', 100, 200)])).toEqual({
      status: 'refused',
      reason: { rule: 'unbalanced', difference: 0.01 },
    });
    expect(settled([row('1', 'Ann', 100, 0), row('2', 'Ben', 100, 200)]).transfers).toHaveLength(1);
  });
});

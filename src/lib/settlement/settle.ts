import { formatCurrency } from './format';

export interface GamePlayer {
  id: string;
  buyIn: number;
  cashOut: number;
}

export interface GamePayment {
  fromId: string;
  toId: string;
  amount: number;
}

export interface Game {
  players: GamePlayer[];
  payments?: GamePayment[];
}

export interface Transfer {
  fromId: string;
  toId: string;
  amount: number;
}

/** A refusal where the Players themselves are fine, so their totals and Profits still stand. */
export type GameRefusalReason =
  /** `difference` is total Cash-outs minus total Buy-ins: negative means short, positive over. */
  | { rule: 'unbalanced'; difference: number }
  | { rule: 'unknown-player'; paymentIndex: number; playerId: string }
  | { rule: 'self-payment'; paymentIndex: number; playerId: string }
  /** The amount is zero or less once rounded to the cent. */
  | { rule: 'non-positive-payment'; paymentIndex: number };

/** A refusal where a Player is invalid, so there are no totals or Profits to give. */
export type PlayerRefusalReason =
  | { rule: 'duplicate-player'; playerId: string }
  /** A Buy-in or Cash-out below zero (or not a number). */
  | { rule: 'negative-amount'; playerId: string };

export type RefusalReason = GameRefusalReason | PlayerRefusalReason;

/** A game's totals and each Player's Profit, whether or not it settles. */
export interface GameSummary {
  totalBuyIn: number;
  totalCashOut: number;
  /** Each Player's Profit (Cash-out minus Buy-in) by id, in input order. Payments don't change it. */
  profits: Map<string, number>;
}

export interface Settled extends GameSummary {
  status: 'settled';
  transfers: Transfer[];
}

export type Refused =
  | ({ status: 'refused'; reason: GameRefusalReason } & GameSummary)
  | { status: 'refused'; reason: PlayerRefusalReason };

export type SettlementResult = Settled | Refused;

/** The result's totals and Profits, or null when a Player is invalid. */
export function summaryOf(result: SettlementResultOf<unknown>): GameSummary | null {
  return 'profits' in result ? result : null;
}

/** The Transfers to show: none unless the game settled. */
export function transfersOf<T>(result: { status: 'settled'; transfers: T[] } | { status: 'refused' }): T[] {
  return result.status === 'settled' ? result.transfers : [];
}

/** A result with each Transfer in a caller's own shape. */
export type SettlementResultOf<T> = Refused | (Omit<Settled, 'transfers'> & { transfers: T[] });

/** Puts each Transfer in a caller's own shape; a refusal passes through unchanged. */
export function mapTransfers<T>(result: SettlementResult, toShape: (transfer: Transfer) => T): SettlementResultOf<T> {
  if (result.status === 'refused') return result;
  return { ...result, transfers: result.transfers.map(toShape) };
}

const toCents = (dollars: number) => Math.round(dollars * 100);
const toDollars = (cents: number) => cents / 100;

/**
 * The one Settlement for a game: who pays whom after Payments.
 *
 * Amounts go in and come out in dollars, but the maths is done in whole cents,
 * so "Balanced" means equal to the cent and any Transfer of 1 cent or more is
 * kept. An invalid or unbalanced game is refused with the rule it broke.
 * Pairing: the Player who still owes most pays the Player still owed most,
 * until everyone is square.
 */
export function settle(game: Game): SettlementResult {
  const players = game.players.map(pl => ({ id: pl.id, buyIn: toCents(pl.buyIn), cashOut: toCents(pl.cashOut) }));
  const payments = (game.payments ?? []).map(pay => ({ ...pay, amount: toCents(pay.amount) }));
  const totalBuyIn = players.reduce((s, pl) => s + pl.buyIn, 0);
  const totalCashOut = players.reduce((s, pl) => s + pl.cashOut, 0);

  const invalidPlayer = findInvalidPlayer(players);
  if (invalidPlayer) return { status: 'refused', reason: invalidPlayer };

  const summary: GameSummary = {
    totalBuyIn: toDollars(totalBuyIn),
    totalCashOut: toDollars(totalCashOut),
    profits: new Map(players.map(pl => [pl.id, toDollars(pl.cashOut - pl.buyIn)])),
  };
  const invalidPayment = findInvalidPayment(players, payments);
  if (invalidPayment) return { status: 'refused', reason: invalidPayment, ...summary };

  if (totalCashOut !== totalBuyIn) {
    return {
      status: 'refused',
      reason: { rule: 'unbalanced', difference: toDollars(totalCashOut - totalBuyIn) },
      ...summary,
    };
  }

  const owed = players.map(pl => ({ id: pl.id, remaining: pl.buyIn - pl.cashOut }));
  const byId = new Map(owed.map(e => [e.id, e]));
  for (const payment of payments) {
    byId.get(payment.fromId)!.remaining -= payment.amount;
    byId.get(payment.toId)!.remaining += payment.amount;
  }
  const debtors = owed.filter(e => e.remaining > 0).sort((a, b) => b.remaining - a.remaining);
  const creditors = owed
    .filter(e => e.remaining < 0)
    .map(e => ({ id: e.id, remaining: -e.remaining }))
    .sort((a, b) => b.remaining - a.remaining);

  const transfers: Transfer[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].remaining, creditors[j].remaining);
    transfers.push({ fromId: debtors[i].id, toId: creditors[j].id, amount: toDollars(amount) });
    debtors[i].remaining -= amount;
    creditors[j].remaining -= amount;
    if (debtors[i].remaining === 0) i++;
    if (creditors[j].remaining === 0) j++;
  }
  return { status: 'settled', transfers, ...summary };
}

function findInvalidPlayer(players: { id: string; buyIn: number; cashOut: number }[]): PlayerRefusalReason | null {
  const seen = new Set<string>();
  for (const pl of players) {
    if (seen.has(pl.id)) return { rule: 'duplicate-player', playerId: pl.id };
    seen.add(pl.id);
    if (!(pl.buyIn >= 0 && pl.cashOut >= 0)) return { rule: 'negative-amount', playerId: pl.id };
  }
  return null;
}

function findInvalidPayment(players: { id: string }[], payments: GamePayment[]): GameRefusalReason | null {
  const ids = new Set(players.map(pl => pl.id));
  for (const [paymentIndex, pay] of payments.entries()) {
    const unknown = [pay.fromId, pay.toId].find(id => !ids.has(id));
    if (unknown !== undefined) return { rule: 'unknown-player', paymentIndex, playerId: unknown };
    if (pay.fromId === pay.toId) return { rule: 'self-payment', paymentIndex, playerId: pay.fromId };
    if (!(pay.amount > 0)) return { rule: 'non-positive-payment', paymentIndex };
  }
  return null;
}

/** A one-line reason to show in place of the Transfers. */
export function describeRefusal(reason: RefusalReason, currency = '$'): string {
  switch (reason.rule) {
    case 'unbalanced':
      return `Cash-outs are ${formatCurrency(reason.difference, currency)} ${reason.difference < 0 ? 'short' : 'over'}`;
    case 'duplicate-player':
      return 'A player is listed twice';
    case 'negative-amount':
      return 'A buy-in or cash-out is negative';
    case 'unknown-player':
      return "A payment names a player who isn't in this game";
    case 'self-payment':
      return 'A payment goes from a player to themselves';
    case 'non-positive-payment':
      return 'A payment must be more than zero';
  }
}

export interface OneOffPlayer {
  id: string;
  name: string;
  buy_in: number;
  /** null while the player is still seated in a live game. */
  cash_out: number | null;
}

export interface OneOffPayment {
  from_id: string;
  to_id: string;
  amount: number;
}

export interface OneOffTransfer {
  from_id: string;
  to_id: string;
  amount: number;
}

export interface OneOffGame {
  version: 1;
  mode: 'live' | 'totals';
  label: string;
  played_on: string; // YYYY-MM-DD
  currency: string;
  notes: string;
  default_buy_in: number;
  started_at: string;
  players: OneOffPlayer[];
  payments: OneOffPayment[];
}

export interface SavedOneOffGame {
  id: string;
  played_on: string;
  label: string | null;
  currency: string;
  notes: string | null;
  players: { id: string; name: string; buy_in: number; cash_out: number }[];
  payments: OneOffPayment[];
  transfers: OneOffTransfer[];
  created_at: string;
}

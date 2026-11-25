import type { OneOffGame, OneOffPayment, OneOffPlayer } from './types';
import { validateNames } from './localStore';

export type OneOffAction =
  | { type: 'start'; game: OneOffGame }
  | { type: 'addPlayer'; id: string; name: string; buyIn: number }
  | { type: 'removePlayer'; id: string }
  | { type: 'addBuyIn'; id: string; amount: number }
  | { type: 'setBuyIn'; id: string; total: number }
  | { type: 'cashOut'; id: string; amount: number }
  | { type: 'rejoin'; id: string }
  | { type: 'setCashOut'; id: string; amount: number }
  | { type: 'renamePlayer'; id: string; name: string }
  | { type: 'addPayment'; payment: OneOffPayment }
  | { type: 'removePayment'; index: number }
  | { type: 'setMeta'; patch: Partial<Pick<OneOffGame, 'label' | 'played_on' | 'currency' | 'notes'>> };

export interface OneOffResult {
  state: OneOffGame;
  error: string | null;
}

// Same rounding and floor-at-zero rules as the homegame live session
// (src/contexts/LiveSessionContext.tsx), so the two screens agree.
const round2 = (n: number) => Math.round(n * 100) / 100;
const money = (n: number) => round2(Math.max(0, n));

const MISSING_PLAYER = 'That player is not in this game';

function updatePlayer(
  state: OneOffGame,
  id: string,
  change: (p: OneOffPlayer) => OneOffPlayer
): OneOffResult {
  if (!state.players.some(p => p.id === id)) return { state, error: MISSING_PLAYER };
  return {
    state: { ...state, players: state.players.map(p => (p.id === id ? change(p) : p)) },
    error: null,
  };
}

export function oneOffReducer(state: OneOffGame, action: OneOffAction): OneOffResult {
  switch (action.type) {
    case 'start':
      return { state: action.game, error: null };

    case 'addPlayer': {
      const error = validateNames([...state.players.map(p => p.name), action.name]);
      if (error) return { state, error };
      const added: OneOffPlayer = {
        id: action.id,
        name: action.name.trim(),
        buy_in: money(action.buyIn),
        cash_out: null,
      };
      return { state: { ...state, players: [...state.players, added] }, error: null };
    }

    case 'removePlayer': {
      if (!state.players.some(p => p.id === action.id)) return { state, error: MISSING_PLAYER };
      if (state.payments.some(p => p.from_id === action.id || p.to_id === action.id)) {
        return { state, error: 'Remove their payments first' };
      }
      return {
        state: { ...state, players: state.players.filter(p => p.id !== action.id) },
        error: null,
      };
    }

    case 'addBuyIn':
      return updatePlayer(state, action.id, p => ({ ...p, buy_in: money(p.buy_in + action.amount) }));

    case 'setBuyIn':
      return updatePlayer(state, action.id, p => ({ ...p, buy_in: money(action.total) }));

    case 'cashOut':
    case 'setCashOut':
      return updatePlayer(state, action.id, p => ({ ...p, cash_out: money(action.amount) }));

    case 'rejoin':
      return updatePlayer(state, action.id, p => ({ ...p, cash_out: null }));

    case 'renamePlayer': {
      if (!state.players.some(p => p.id === action.id)) return { state, error: MISSING_PLAYER };
      // The new name goes last so a clash is reported as the name just typed.
      const others = state.players.filter(p => p.id !== action.id).map(p => p.name);
      const error = validateNames([...others, action.name]);
      if (error) return { state, error };
      return updatePlayer(state, action.id, p => ({ ...p, name: action.name.trim() }));
    }

    case 'addPayment': {
      const { from_id, to_id } = action.payment;
      const amount = round2(action.payment.amount);
      if (from_id === to_id) return { state, error: 'Pick two different players' };
      if (!(amount > 0)) return { state, error: 'Enter an amount above 0' };
      const ids = new Set(state.players.map(p => p.id));
      if (!ids.has(from_id) || !ids.has(to_id)) return { state, error: MISSING_PLAYER };
      return {
        state: { ...state, payments: [...state.payments, { from_id, to_id, amount }] },
        error: null,
      };
    }

    case 'removePayment': {
      if (action.index < 0 || action.index >= state.payments.length) {
        return { state, error: 'That payment is not in this game' };
      }
      return {
        state: { ...state, payments: state.payments.filter((_, i) => i !== action.index) },
        error: null,
      };
    }

    case 'setMeta':
      return { state: { ...state, ...action.patch }, error: null };
  }
}

import { createContext, useCallback, useContext, useRef, useState, ReactNode } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import type { OneOffGame } from '@/lib/oneOff/types';
import { oneOffReducer, type OneOffAction } from '@/lib/oneOff/reducer';
import { clearGame, loadGame, localDate, saveGame, validateNames } from '@/lib/oneOff/localStore';

export interface StartOneOffInput {
  mode: 'live' | 'totals';
  names: string[];
  defaultBuyIn: number;
  label?: string;
  currency?: string;
}

type Result = { error: string | null };

interface Slot {
  owner: string | undefined;
  game: OneOffGame | null;
  storageOk: boolean;
}

interface OneOffGameContextType {
  game: OneOffGame | null;
  /** False once a save to this device has failed; the game then lives in memory only. */
  storageOk: boolean;
  seatedCount: number;
  totalBuyIn: number;
  totalPot: number;
  start: (input: StartOneOffInput) => Result;
  dispatch: (action: OneOffAction) => Result;
  discard: () => void;
}

const OneOffGameContext = createContext<OneOffGameContextType | undefined>(undefined);

// A stored v1 payload is only trusted as a game if it has its lists; anything
// else (a hand-edited or half-written entry) is treated as no game.
function restore(userId: string | undefined): OneOffGame | null {
  if (!userId) return null;
  const game = loadGame(userId);
  if (!game || !Array.isArray(game.players) || !Array.isArray(game.payments)) return null;
  return game;
}

export function OneOffGameProvider({ children }: { children: ReactNode }) {
  const { user, homegame } = useAuthContext();
  const userId = user?.id;

  // The game and the user it belongs to live in one slot, and saves always use
  // the slot's owner, so a game can never be written under another user's key.
  const [slot, setSlot] = useState<Slot>(() => ({
    owner: userId,
    game: restore(userId),
    storageOk: true,
  }));
  let current = slot;
  if (slot.owner !== userId) {
    // Reset during render (not in an effect) so the new user never sees, and
    // nothing can act on, the previous user's game, even for one render.
    current = { owner: userId, game: restore(userId), storageOk: true };
    setSlot(current);
  }
  const { game, storageOk } = current;
  // The latest slot, read synchronously so dispatch can return the reducer's error.
  const slotRef = useRef(current);
  slotRef.current = current;

  const commit = useCallback((next: OneOffGame) => {
    const { owner } = slotRef.current;
    const saved = owner ? saveGame(owner, next) : true;
    const updated: Slot = { owner, game: next, storageOk: saved };
    slotRef.current = updated;
    setSlot(updated);
  }, []);

  const dispatch = useCallback(
    (action: OneOffAction): Result => {
      const current = slotRef.current.game;
      if (!current) return { error: 'No game in progress' };
      const { state, error } = oneOffReducer(current, action);
      if (error) return { error };
      commit(state);
      return { error: null };
    },
    [commit]
  );

  const start = useCallback(
    (input: StartOneOffInput): Result => {
      if (input.names.length < 2) return { error: 'Add at least two players' };
      const error = validateNames(input.names);
      if (error) return { error };
      const now = new Date();
      const buyIn = input.mode === 'live' ? input.defaultBuyIn : 0;
      const next: OneOffGame = {
        version: 1,
        mode: input.mode,
        label: input.label ?? '',
        played_on: localDate(now),
        currency: input.currency ?? homegame?.currency ?? '$',
        notes: '',
        default_buy_in: input.defaultBuyIn,
        started_at: now.toISOString(),
        players: input.names.map(name => ({
          id: crypto.randomUUID(),
          name: name.trim(),
          buy_in: buyIn,
          cash_out: null,
        })),
        payments: [],
      };
      commit(next);
      return { error: null };
    },
    [commit, homegame?.currency]
  );

  const discard = useCallback(() => {
    const { owner, storageOk: ok } = slotRef.current;
    if (owner) clearGame(owner);
    const updated: Slot = { owner, game: null, storageOk: ok };
    slotRef.current = updated;
    setSlot(updated);
  }, []);

  const players = game?.players ?? [];
  /** Money bought in by everyone, including players who have already left. */
  const totalBuyIn = players.reduce((sum, p) => sum + p.buy_in, 0);
  /** Chips still in play: buy-ins minus what departed players took off the table. */
  const totalPot = players.reduce((sum, p) => sum + p.buy_in - (p.cash_out ?? 0), 0);
  const seatedCount = players.filter(p => p.cash_out === null).length;

  return (
    <OneOffGameContext.Provider
      value={{ game, storageOk, seatedCount, totalBuyIn, totalPot, start, dispatch, discard }}
    >
      {children}
    </OneOffGameContext.Provider>
  );
}

// The hook lives beside its provider, as in AuthContext and LiveSessionContext;
// the lint warning count is held fixed, so this one is silenced rather than added.
// eslint-disable-next-line react-refresh/only-export-components
export function useOneOffGame() {
  const context = useContext(OneOffGameContext);
  if (context === undefined) {
    throw new Error('useOneOffGame must be used within a OneOffGameProvider');
  }
  return context;
}

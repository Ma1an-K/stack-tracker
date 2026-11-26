import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { logError } from '@/lib/errorLog';
import { settleOneOff } from '@/lib/oneOff/settle';
import { clearGame } from '@/lib/oneOff/localStore';
import type { OneOffGame, SavedOneOffGame } from '@/lib/oneOff/types';
import type { Json } from '@/integrations/supabase/types';

const SAVE_FAILED = "Couldn't save. Check your connection and try again.";
const LOAD_FAILED = "Couldn't load this game. Check your connection and try again.";

export interface UseOneOffHistoryOptions {
  /** Load the saved-games list on mount (default true). The detail page turns this off. */
  loadList?: boolean;
}

const blankToNull = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

/**
 * The signed-in user's saved one-off games. Rows are owner-only (RLS) and
 * `user_id` defaults to auth.uid() on the server, so it is never sent from
 * here. One-offs have no homegame and send no push notifications.
 */
export function useOneOffHistory({ loadList = true }: UseOneOffHistoryOptions = {}) {
  const [games, setGames] = useState<SavedOneOffGame[]>([]);
  const [loading, setLoading] = useState(loadList);

  const refetch = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('oneoff_games')
        .select('*')
        .order('played_on', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      setGames((data ?? []) as unknown as SavedOneOffGame[]);
    } catch (err) {
      console.error('Error fetching one-off games:', err);
      toast({ title: 'Error', description: "Couldn't load your games", variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (loadList) void refetch();
  }, [refetch, loadList]);

  /** One game by id. `game: null, error: null` means it doesn't exist (or isn't yours). */
  const fetchOne = useCallback(
    async (id: string): Promise<{ game: SavedOneOffGame | null; error: string | null }> => {
      try {
        const { data, error } = await supabase
          .from('oneoff_games')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        if (error) throw error;
        return { game: (data ?? null) as unknown as SavedOneOffGame | null, error: null };
      } catch (err) {
        console.error('Error fetching one-off game:', err);
        return { game: null, error: LOAD_FAILED };
      }
    },
    []
  );

  /** One game by id, or null when it is missing or couldn't be loaded. */
  const get = useCallback(async (id: string) => (await fetchOne(id)).game, [fetchOne]);

  const save = useCallback(
    async (game: OneOffGame, userId: string): Promise<{ id: string | null; error: string | null }> => {
      // Mirror the table's CHECK constraints so a bad field gets a specific
      // message instead of the generic connection error.
      if (game.players.length < 2 || game.players.length > 50) {
        return { id: null, error: 'A game needs 2 to 50 players' };
      }
      const label = blankToNull(game.label);
      if (label !== null && label.length > 80) {
        return { id: null, error: 'Keep the label to 80 characters' };
      }
      const notes = blankToNull(game.notes);
      if (notes !== null && notes.length > 2000) {
        return { id: null, error: 'Keep notes to 2,000 characters' };
      }
      const currency = game.currency.trim();
      if (currency.length < 1 || currency.length > 8) {
        return { id: null, error: 'Enter a currency symbol up to 8 characters' };
      }
      if (game.payments.length > 200) {
        return { id: null, error: 'Too many payments to save (200 max)' };
      }
      if (game.players.some((p) => p.cash_out === null)) {
        return { id: null, error: 'Cash everyone out first' };
      }
      const players = game.players.map((p) => ({
        id: p.id,
        name: p.name,
        buy_in: p.buy_in,
        cash_out: p.cash_out as number,
      }));
      const settlement = settleOneOff(players, game.payments);
      if (!settlement.balanced) {
        return { id: null, error: "Totals don't balance yet" };
      }

      let id: string;
      try {
        const { data, error } = await supabase
          .from('oneoff_games')
          .insert({
            played_on: game.played_on,
            label,
            currency,
            notes,
            players: players as unknown as Json,
            payments: game.payments as unknown as Json,
            transfers: settlement.transfers as unknown as Json,
          })
          .select('id')
          .single();
        if (error) throw error;
        if (!data) throw new Error('no row returned');
        id = (data as { id: string }).id;
      } catch (err) {
        // Keep the device copy: the game is not on the server yet.
        logError({ kind: 'save_failed', action: 'useOneOffHistory.save', error: err });
        return { id: null, error: SAVE_FAILED };
      }

      clearGame(userId);
      void refetch();
      return { id, error: null };
    },
    [refetch],
  );

  const remove = useCallback(
    async (id: string): Promise<{ error: string | null }> => {
      try {
        const { error } = await supabase.from('oneoff_games').delete().eq('id', id);
        if (error) throw error;
      } catch (err) {
        // error_log only allows 'crash' and 'save_failed'; a failed delete is a failed
        // write, and `action` says which one.
        logError({ kind: 'save_failed', action: 'useOneOffHistory.remove', error: err });
        return { error: "Couldn't delete. Check your connection and try again." };
      }
      await refetch();
      return { error: null };
    },
    [refetch],
  );

  return { games, loading, refetch, get, fetchOne, save, remove };
}

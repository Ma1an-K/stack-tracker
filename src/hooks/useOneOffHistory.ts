import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { logError } from '@/lib/errorLog';
import { settleOneOff } from '@/lib/oneOff/settle';
import { clearGame } from '@/lib/oneOff/localStore';
import type { OneOffGame, SavedOneOffGame } from '@/lib/oneOff/types';
import type { Json } from '@/integrations/supabase/types';

const SAVE_FAILED = "Couldn't save. Check your connection and try again.";

const blankToNull = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

/**
 * The signed-in user's saved one-off games. Rows are owner-only (RLS) and
 * `user_id` defaults to auth.uid() on the server, so it is never sent from
 * here. One-offs have no homegame and send no push notifications.
 */
export function useOneOffHistory() {
  const [games, setGames] = useState<SavedOneOffGame[]>([]);
  const [loading, setLoading] = useState(true);

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
    void refetch();
  }, [refetch]);

  const get = useCallback(async (id: string): Promise<SavedOneOffGame | null> => {
    const { data, error } = await supabase
      .from('oneoff_games')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) {
      console.error('Error fetching one-off game:', error);
      return null;
    }
    return (data ?? null) as unknown as SavedOneOffGame | null;
  }, []);

  const save = useCallback(
    async (game: OneOffGame, userId: string): Promise<{ id: string | null; error: string | null }> => {
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

      const { data, error } = await supabase
        .from('oneoff_games')
        .insert({
          played_on: game.played_on,
          label: blankToNull(game.label),
          currency: game.currency,
          notes: blankToNull(game.notes),
          players: players as unknown as Json,
          payments: game.payments as unknown as Json,
          transfers: settlement.transfers as unknown as Json,
        })
        .select('id')
        .single();

      if (error || !data) {
        // Keep the device copy: the game is not on the server yet.
        logError({ kind: 'save_failed', action: 'useOneOffHistory.save', error: error ?? 'no row returned' });
        return { id: null, error: SAVE_FAILED };
      }

      clearGame(userId);
      void refetch();
      return { id: (data as { id: string }).id, error: null };
    },
    [refetch],
  );

  const remove = useCallback(
    async (id: string): Promise<{ error: string | null }> => {
      const { error } = await supabase.from('oneoff_games').delete().eq('id', id);
      if (error) {
        logError({ kind: 'save_failed', action: 'useOneOffHistory.remove', error });
        return { error: "Couldn't delete. Check your connection and try again." };
      }
      await refetch();
      return { error: null };
    },
    [refetch],
  );

  return { games, loading, refetch, get, save, remove };
}

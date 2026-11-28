import { useOneOffHistory } from '@/hooks/useOneOffHistory';
import type { SavedOneOffGame } from '@/lib/oneOff/types';

/** The fields a saved-games list shows. */
export type SavedOneOffSummary = Pick<SavedOneOffGame, 'id' | 'label' | 'played_on' | 'currency' | 'players' | 'created_at'>;

/**
 * The signed-in user's saved one-off games, newest first, for lists (the
 * one-off hub and Home without a homegame). Read-only view of the same
 * owner-only query `useOneOffHistory` runs.
 */
export function useSavedOneOffGames(): { games: SavedOneOffSummary[]; loading: boolean } {
  const { games, loading } = useOneOffHistory();
  return { games, loading };
}

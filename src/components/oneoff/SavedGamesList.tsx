import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ChevronRight, History } from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';
import { PageSkeleton } from '@/components/common/PageSkeleton';
import { playerCount } from '@/lib/oneOff/format';
import type { SavedOneOffSummary } from '@/hooks/useSavedOneOffGames';

interface SavedGamesListProps {
  games: SavedOneOffSummary[];
  loading: boolean;
}

/** Saved one-off games, each linking to its detail page, with loading and empty states. */
export function SavedGamesList({ games, loading }: SavedGamesListProps) {
  if (loading && games.length === 0) return <PageSkeleton rows={2} />;
  if (games.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="No saved games yet"
        description="Games you save to your history show up here. Only you can see them."
      />
    );
  }
  return (
    <ul className="surface divide-y divide-border/50 overflow-hidden">
      {games.map(g => (
        <li key={g.id}>
          <Link
            to={`/one-off/saved/${g.id}`}
            className="flex min-h-[64px] items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/40 focus:outline-none focus-visible:bg-accent/50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{g.label?.trim() || 'One-off game'}</p>
              <p className="text-[0.8125rem] text-muted-foreground">{format(parseISO(g.played_on), 'EEE, MMM d, yyyy')}</p>
            </div>
            <span className="shrink-0 text-[0.8125rem] text-muted-foreground tabular-nums">{playerCount(g.players.length)}</span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

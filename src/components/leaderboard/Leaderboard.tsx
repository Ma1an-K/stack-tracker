import { useState, useMemo } from 'react';
import { SessionWithPlayers, Player } from '@/types/database';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { cn } from '@/lib/utils';
import { TimeFrame, filterSessionsByTimeFrame, calculateLeaderboard } from '@/lib/leaderboard';
import { formatCurrency, formatProfit } from '@/lib/settlement';
import { computeHomegameBadges } from '@/lib/badges';
import { PlayerBadges } from '@/components/badges/PlayerBadges';
import { HeadToHead } from './HeadToHead';
import { useAuthContext } from '@/contexts/AuthContext';

interface LeaderboardProps {
  sessions: SessionWithPlayers[];
  players: Player[];
  currency: string;
  /** Optional slot rendered next to the title (e.g. a refreshing indicator). */
  titleAside?: React.ReactNode;
}

export function Leaderboard({ sessions, players, currency, titleAside }: LeaderboardProps) {
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('all');
  const [h2hOpponent, setH2hOpponent] = useState<Player | null>(null);
  const { user, homegame } = useAuthContext();

  const filteredSessions = filterSessionsByTimeFrame(sessions, timeFrame);
  const leaderboard = calculateLeaderboard(filteredSessions, players);

  // Find the current user's claimed player in this homegame
  const myPlayer = useMemo(
    () => players.find(p => p.user_id === user?.id) || null,
    [players, user]
  );

  // Compute badges from ALL sessions (not filtered) since badges are cumulative
  const badgeMap = useMemo(
    () => computeHomegameBadges(sessions, players, homegame?.disabled_badges ?? []),
    [sessions, players, homegame?.disabled_badges]
  );

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={homegame?.name} title="Standings" action={titleAside} />

      <Tabs value={timeFrame} onValueChange={(v) => setTimeFrame(v as TimeFrame)}>
        <TabsList className="grid w-full grid-cols-4" aria-label="Time frame">
          <TabsTrigger value="week">Week</TabsTrigger>
          <TabsTrigger value="month">Month</TabsTrigger>
          <TabsTrigger value="year">Year</TabsTrigger>
          <TabsTrigger value="all">All time</TabsTrigger>
        </TabsList>
      </Tabs>

      {leaderboard.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="No results here yet"
          description={timeFrame === 'all' ? 'Standings appear once the first session is logged.' : 'No sessions in this period. Try a longer time frame.'}
        />
      ) : (
        <ol className="space-y-2" aria-label="Leaderboard. Choose a player for head-to-head.">
          {leaderboard.map((stat, index) => {
            const isTop3 = index < 3;
            const rankDisplay = `${index + 1}`.padStart(2, '0');
            const playerBadges = badgeMap.get(stat.player.id) || [];
            const isMe = myPlayer?.id === stat.player.id;
            const open = () => setH2hOpponent(stat.player);

            return (
              <li
                key={stat.player.id}
                className={cn(
                  'surface pressable relative flex min-h-[68px] cursor-pointer items-center gap-3 px-3.5 py-3 hover:border-gold/30',
                  index === 0 && 'border-gold/40 bg-[linear-gradient(100deg,hsl(var(--gold)/0.10),hsl(var(--card))_45%)]',
                  isMe && 'ring-1 ring-gold/30'
                )}
              >
                {/* The whole row is one button; the badge chips sit above it so
                    they stay separately tappable (no nested interactive elements). */}
                <button
                  type="button"
                  onClick={open}
                  aria-label={`${stat.player.name}, rank ${index + 1}, ${formatProfit(stat.netProfit, currency)}. Open head-to-head`}
                  className="absolute inset-0 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <span
                  aria-hidden="true"
                  className={cn(
                    'pointer-events-none w-8 shrink-0 text-center tabular-nums',
                    isTop3 ? 'font-display text-[1.5rem] font-semibold text-gold' : 'text-sm font-medium text-muted-foreground'
                  )}
                >
                  {rankDisplay}
                </span>

                <span aria-hidden="true" className="pointer-events-none min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate font-medium">{stat.player.name}</span>
                    {isMe && <span className="shrink-0 rounded-full bg-gold/15 px-1.5 py-px text-[0.6875rem] font-semibold uppercase tracking-wide text-gold">You</span>}
                  </span>
                  <span className="flex flex-wrap gap-x-1 text-xs text-muted-foreground tabular-nums">
                    <span className="whitespace-nowrap">{stat.sessionsPlayed} session{stat.sessionsPlayed !== 1 ? 's' : ''}</span>
                    <span className="whitespace-nowrap">· {formatProfit(stat.avgProfit, currency)} avg</span>
                  </span>
                </span>

                {/* Badges — 2 max on mobile, 4 on desktop */}
                <span className="relative z-[1] flex max-w-[4.5rem] shrink-0 items-center justify-end overflow-hidden md:max-w-[10rem]">
                  {playerBadges.length > 0 && (
                    <PlayerBadges badges={playerBadges} currency={currency} size="sm" maxDisplay={2} />
                  )}
                </span>

                <span aria-hidden="true" className={cn('pointer-events-none w-[5.5rem] shrink-0 text-right text-[0.9375rem] font-semibold tabular-nums md:w-32', stat.netProfit >= 0 ? 'profit' : 'loss')}>
                  {formatProfit(stat.netProfit, currency)}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      {/* Summary Stats */}
      {leaderboard.length > 0 && (
        <section className="surface p-4 sm:p-5">
          <h2 className="section-header mb-4">Summary</h2>
          <div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-5">
              <div className="space-y-1">
                <div className="font-display text-[1.75rem] leading-none font-semibold tabular-nums">{filteredSessions.length}</div>
                <div className="text-[0.6875rem] text-muted-foreground uppercase tracking-[0.12em]">Sessions</div>
              </div>
              <div className="space-y-1">
                <div className="font-display text-[1.75rem] leading-none font-semibold tabular-nums">{leaderboard.length}</div>
                <div className="text-[0.6875rem] text-muted-foreground uppercase tracking-[0.12em]">Players</div>
              </div>
              <div className="space-y-1">
                <div className="font-display text-[1.75rem] leading-none font-semibold tabular-nums text-gold">
                  {formatCurrency(
                    leaderboard.reduce((sum, s) => sum + s.totalBuyIn, 0),
                    currency
                  )}
                </div>
                <div className="text-[0.6875rem] text-muted-foreground uppercase tracking-[0.12em]">Total Volume</div>
              </div>
              <div className="space-y-1">
                <div className="font-display text-[1.75rem] leading-none font-semibold tabular-nums profit">
                  {formatCurrency(
                    Math.max(...leaderboard.map(s => s.netProfit)),
                    currency
                  )}
                </div>
                <div className="text-[0.6875rem] text-muted-foreground uppercase tracking-[0.12em]">Top Earner</div>
              </div>
            </div>
          </div>
        </section>
      )}

      {h2hOpponent && (
        <HeadToHead
          open={!!h2hOpponent}
          onOpenChange={(open) => !open && setH2hOpponent(null)}
          myPlayer={myPlayer}
          opponent={h2hOpponent}
          sessions={sessions}
          currency={currency}
        />
      )}
    </div>
  );
}

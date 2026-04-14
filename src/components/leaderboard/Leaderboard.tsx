import { useState, useMemo } from 'react';
import { SessionWithPlayers, Player } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
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
}

export function Leaderboard({ sessions, players, currency }: LeaderboardProps) {
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('all');
  const [h2hOpponent, setH2hOpponent] = useState<Player | null>(null);
  const { user } = useAuthContext();

  const filteredSessions = filterSessionsByTimeFrame(sessions, timeFrame);
  const leaderboard = calculateLeaderboard(filteredSessions, players);

  // Find the current user's claimed player in this homegame
  const myPlayer = useMemo(
    () => players.find(p => p.user_id === user?.id) || null,
    [players, user]
  );

  // Compute badges from ALL sessions (not filtered) since badges are cumulative
  const badgeMap = useMemo(
    () => computeHomegameBadges(sessions, players),
    [sessions, players]
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
              Standings
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={timeFrame} onValueChange={(v) => setTimeFrame(v as TimeFrame)}>
            <TabsList className="grid w-full grid-cols-4 bg-muted/50">
              <TabsTrigger value="week" className="text-xs">Week</TabsTrigger>
              <TabsTrigger value="month" className="text-xs">Month</TabsTrigger>
              <TabsTrigger value="year" className="text-xs">Year</TabsTrigger>
              <TabsTrigger value="all" className="text-xs">All Time</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {leaderboard.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No sessions found for this time period
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {leaderboard.map((stat, index) => {
            const isTop3 = index < 3;
            const rankDisplay = `${index + 1}`.padStart(2, '0');
            const playerBadges = badgeMap.get(stat.player.id) || [];

            return (
              <Card
                key={stat.player.id}
                className={`transition-all duration-150 cursor-pointer hover:bg-muted/30 ${isTop3 ? 'border-border/80' : 'border-border/50'}`}
                onClick={() => setH2hOpponent(stat.player)}
              >
                <CardContent className="py-4">
                  <div className="flex items-center gap-2">
                    {/* Rank */}
                    <div className={`w-7 flex-shrink-0 text-center font-mono text-sm ${isTop3 ? 'text-gold font-semibold' : 'text-muted-foreground'}`}>
                      {rankDisplay}
                    </div>

                    {/* Player info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{stat.player.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {stat.sessionsPlayed} session{stat.sessionsPlayed !== 1 ? 's' : ''}
                      </div>
                    </div>

                    {/* Badges — 2 max on mobile, 4 on desktop */}
                    <div
                      className="flex-shrink-0 flex items-center justify-end overflow-hidden max-w-[4.5rem] md:max-w-[10rem]"
                      onClick={e => e.stopPropagation()}
                    >
                      {playerBadges.length > 0 && (
                        <PlayerBadges badges={playerBadges} currency={currency} size="sm" maxDisplay={2} />
                      )}
                    </div>

                    {/* Net position */}
                    <div className="w-20 flex-shrink-0 text-right md:w-32">
                      <div className={`text-sm font-semibold tabular-nums flex items-center justify-end gap-1 ${stat.netProfit >= 0 ? 'profit' : 'loss'}`}>
                        {stat.netProfit >= 0 ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        {formatProfit(stat.netProfit, currency)}
                      </div>
                      <div className="text-xs text-muted-foreground tabular-nums">
                        {formatProfit(stat.avgProfit, currency)}/avg
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Summary Stats */}
      {leaderboard.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <span className="section-header">Summary</span>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="space-y-1">
                <div className="text-2xl font-semibold tabular-nums">{filteredSessions.length}</div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Sessions</div>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-semibold tabular-nums">{leaderboard.length}</div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Players</div>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-semibold tabular-nums text-gold">
                  {formatCurrency(
                    leaderboard.reduce((sum, s) => sum + s.totalBuyIn, 0),
                    currency
                  )}
                </div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Total Volume</div>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-semibold tabular-nums profit">
                  {formatCurrency(
                    Math.max(...leaderboard.map(s => s.netProfit)),
                    currency
                  )}
                </div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Top Earner</div>
              </div>
            </div>
          </CardContent>
        </Card>
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

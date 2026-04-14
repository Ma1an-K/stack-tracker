import { useState } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { usePersonalStats, HomegameStats, RecentSession } from '@/hooks/usePersonalStats';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Loader2, TrendingUp, TrendingDown, Trophy, Calendar, ArrowRight,
  Users, Flame, Target, Wallet, Award, CheckCircle2, Circle,
  Activity, BarChart2, Zap, ShieldOff,
} from 'lucide-react';
import { formatProfit, formatCurrency } from '@/lib/settlement';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { PlayerBadges } from '@/components/badges/PlayerBadges';
import { ProfitChart } from '@/components/stats/ProfitChart';

export function MyStatsPage() {
  const { profile } = useAuthContext();
  const { homegameStats, recentSessions, overallStats, allSessionHistory, loading } = usePersonalStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasClaimedPlayers = homegameStats.length > 0;

  return (
    <div className="space-y-6 max-w-3xl mx-auto overflow-hidden">
      <div className="flex items-center gap-2">
        <Trophy className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">My Stats</h1>
      </div>

      {!hasClaimedPlayers ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Claimed Players</h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              To see your personal stats, go to the Players page and claim a player that represents you.
              Once approved by the homegame owner, your stats will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Hero Card */}
          {overallStats && (
            <Card className="overflow-hidden w-full">
              <div className={`p-6 ${overallStats.totalProfit >= 0 ? 'bg-gradient-to-br from-green-500/10 to-green-600/5' : 'bg-gradient-to-br from-red-500/10 to-red-600/5'}`}>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-muted-foreground">Lifetime Profit</span>
                  <Badge variant="outline" className="text-xs">
                    {overallStats.sessionsPlayed} sessions
                  </Badge>
                </div>
                <div className={`text-4xl font-bold tabular-nums mb-1 ${overallStats.totalProfit >= 0 ? 'profit' : 'loss'}`}>
                  {formatProfit(overallStats.totalProfit)}
                </div>
                <p className="text-sm text-muted-foreground">
                  {overallStats.totalProfit >= 0 ? 'You\'re up!' : 'Keep grinding!'}
                </p>
              </div>
              <CardContent className="pt-4 space-y-4">
                {/* Quick stats row */}
                <div className="flex gap-4 overflow-x-auto">
                  <StatPill icon={<Target className="h-4 w-4" />} label="Avg/Session" value={formatProfit(overallStats.avgProfit)} positive={overallStats.avgProfit >= 0} />
                  <StatPill icon={<Flame className="h-4 w-4" />} label="Best Win" value={formatProfit(overallStats.biggestWin)} positive />
                  <StatPill icon={<Wallet className="h-4 w-4" />} label="Buy-ins" value={formatCurrency(overallStats.totalBuyIn)} />
                </div>

                {/* Analytics row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-border/40 pt-4">
                  <AnalyticTile label="Win Rate" value={`${Math.round(overallStats.winRate)}%`} icon={<Activity className="h-3.5 w-3.5" />} positive={overallStats.winRate >= 50} />
                  <AnalyticTile label="Std Dev" value={formatCurrency(Math.round(overallStats.stdDev))} icon={<BarChart2 className="h-3.5 w-3.5" />} />
                  <AnalyticTile label="Best Streak" value={`${overallStats.longestWinStreak}W`} icon={<Zap className="h-3.5 w-3.5" />} positive />
                  <AnalyticTile label="Worst Streak" value={`${overallStats.longestLossStreak}L`} icon={<ShieldOff className="h-3.5 w-3.5" />} negative />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Running Profit Chart */}
          {allSessionHistory.length >= 2 && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  <span className="section-header">Profit Over Time</span>
                </div>
              </CardHeader>
              <CardContent className="pt-0 px-2">
                <ProfitChart data={allSessionHistory} />
              </CardContent>
            </Card>
          )}

          {/* Recent Sessions */}
          {recentSessions.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span className="section-header">Recent Sessions</span>
                  </div>
                  <span className="text-xs text-muted-foreground">Last {recentSessions.length}</span>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {recentSessions.map((session, index) => (
                    <SessionRow key={`${session.id}-${session.date}-${index}`} session={session} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Per Homegame Stats */}
          {homegameStats.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-sm font-medium text-muted-foreground px-1">By Homegame</h2>
              {homegameStats.map((hgStats) => (
                <HomegameStatsCard key={hgStats.homegame.id} stats={hgStats} userId={profile?.id} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatPill({ icon, label, value, positive, negative }: {
  icon: React.ReactNode; label: string; value: string; positive?: boolean; negative?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 min-w-0 flex-1">
      <div className="p-2 rounded-full bg-muted/50 flex-shrink-0 text-muted-foreground">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground whitespace-nowrap">{label}</p>
        <p className={`text-sm font-semibold tabular-nums ${positive ? 'profit' : negative ? 'loss' : ''}`}>{value}</p>
      </div>
    </div>
  );
}

function AnalyticTile({ label, value, icon, positive, negative }: {
  label: string; value: string; icon: React.ReactNode; positive?: boolean; negative?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg bg-muted/30 px-3 py-2.5">
      <div className={`flex items-center gap-1.5 text-muted-foreground ${positive ? 'text-green-400/70' : negative ? 'text-red-400/70' : ''}`}>
        {icon}
        <span className="text-[10px] uppercase tracking-wider font-medium">{label}</span>
      </div>
      <p className={`text-base font-bold tabular-nums ${positive ? 'profit' : negative ? 'loss' : ''}`}>{value}</p>
    </div>
  );
}

function SessionRow({ session }: { session: RecentSession }) {
  const isWin = session.profit >= 0;
  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${isWin ? 'bg-green-500/5 hover:bg-green-500/10' : 'bg-red-500/5 hover:bg-red-500/10'}`}>
      <div className={`flex-shrink-0 w-1 h-10 rounded-full ${isWin ? 'bg-green-500' : 'bg-red-500'}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{session.homegameName}</p>
        <p className="text-xs text-muted-foreground">
          {formatDistanceToNow(parseISO(session.date), { addSuffix: true })}
          <span className="mx-1.5">·</span>
          {format(parseISO(session.date), 'MMM d')}
        </p>
      </div>
      <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="tabular-nums">{formatCurrency(session.buyIn, session.currency)}</span>
        <ArrowRight className="h-3 w-3" />
        <span className="tabular-nums">{formatCurrency(session.cashOut, session.currency)}</span>
      </div>
      <div className={`text-right ${isWin ? 'profit' : 'loss'}`}>
        <p className="text-sm font-semibold tabular-nums">{formatProfit(session.profit, session.currency)}</p>
      </div>
    </div>
  );
}

function HomegameStatsCard({ stats, userId }: { stats: HomegameStats; userId?: string }) {
  const { homegame, player, stats: playerStats, pendingSettlements, badges, sessionHistory } = stats;
  const isPositive = playerStats.totalProfit >= 0;

  // Settlement transfer tracking via localStorage
  const storageKey = `settlement_tracker_${userId}_${player.id}_${homegame.id}`;
  const [paidSet, setPaidSet] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return new Set(saved ? JSON.parse(saved) : []);
    } catch { return new Set(); }
  });

  const togglePaid = (key: string) => {
    setPaidSet(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      localStorage.setItem(storageKey, JSON.stringify([...next]));
      return next;
    });
  };

  const settlementKey = (s: typeof pendingSettlements[0]) =>
    `${s.from.id}_${s.to.id}_${Math.round(s.amount)}`;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="font-semibold">{homegame.name}</span>
            <p className="text-xs text-muted-foreground mt-0.5">Playing as {player.name}</p>
          </div>
          <div className="text-right">
            <p className={`text-lg font-bold tabular-nums ${isPositive ? 'profit' : 'loss'}`}>
              {formatProfit(playerStats.totalProfit, homegame.currency)}
            </p>
            <p className="text-xs text-muted-foreground">{playerStats.sessionsPlayed} sessions</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">

        {/* Quick stats */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-muted-foreground">Avg: </span>
              <span className={`font-medium tabular-nums ${playerStats.avgProfit >= 0 ? 'profit' : 'loss'}`}>
                {formatProfit(playerStats.avgProfit, homegame.currency)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Best: </span>
              <span className="font-medium tabular-nums profit">
                {formatProfit(playerStats.biggestWin, homegame.currency)}
              </span>
            </div>
          </div>
        </div>

        {/* Analytics grid */}
        {playerStats.sessionsPlayed >= 2 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <AnalyticTile label="Win Rate" value={`${Math.round(playerStats.winRate)}%`} icon={<Activity className="h-3.5 w-3.5" />} positive={playerStats.winRate >= 50} />
            <AnalyticTile label="Std Dev" value={formatCurrency(Math.round(playerStats.stdDev), homegame.currency)} icon={<BarChart2 className="h-3.5 w-3.5" />} />
            <AnalyticTile label="Best Streak" value={`${playerStats.longestWinStreak}W`} icon={<Zap className="h-3.5 w-3.5" />} positive />
            <AnalyticTile label="Worst Streak" value={`${playerStats.longestLossStreak}L`} icon={<ShieldOff className="h-3.5 w-3.5" />} negative />
          </div>
        )}

        {/* Mini profit chart */}
        {sessionHistory.length >= 2 && (
          <div className="border-t border-border/40 pt-3 -mx-1">
            <ProfitChart data={sessionHistory} currency={homegame.currency} height={100} />
          </div>
        )}

        {/* Badges */}
        {badges && badges.length > 0 && (
          <div className="border-t border-border/40 pt-3">
            <div className="flex items-center gap-2 mb-2">
              <Award className="h-3.5 w-3.5 text-primary" />
              <p className="text-xs font-medium text-muted-foreground">Badges</p>
            </div>
            <PlayerBadges badges={badges} currency={homegame.currency} size="md" />
          </div>
        )}

        {/* Settlements with transfer tracking */}
        {pendingSettlements.length > 0 && (
          <div className="border-t border-border/40 pt-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">Settlements</p>
            <div className="space-y-2">
              {pendingSettlements.map((settlement, idx) => {
                const isOwing = settlement.from.id === player.id;
                const key = settlementKey(settlement);
                const done = paidSet.has(key);
                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-between text-sm p-2.5 rounded-lg transition-colors
                      ${done ? 'bg-muted/30 opacity-60' : isOwing ? 'bg-red-500/5' : 'bg-green-500/5'}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`font-medium whitespace-nowrap ${done ? 'text-muted-foreground' : isOwing ? 'loss' : 'profit'}`}>
                        {isOwing ? 'Pay' : 'Receive from'}
                      </span>
                      <span className="font-semibold truncate">
                        {isOwing ? settlement.to.name : settlement.from.name}
                      </span>
                      <span className={`font-bold tabular-nums ${done ? 'text-muted-foreground' : isOwing ? 'loss' : 'profit'}`}>
                        {formatCurrency(settlement.amount, homegame.currency)}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => togglePaid(key)}
                      className={`h-7 gap-1.5 text-xs flex-shrink-0 ml-2 ${done ? 'text-muted-foreground' : isOwing ? 'text-red-400 hover:text-red-300' : 'text-green-400 hover:text-green-300'}`}
                    >
                      {done
                        ? <><CheckCircle2 className="h-3.5 w-3.5" /> Done</>
                        : <><Circle className="h-3.5 w-3.5" /> {isOwing ? 'Mark sent' : 'Mark received'}</>
                      }
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

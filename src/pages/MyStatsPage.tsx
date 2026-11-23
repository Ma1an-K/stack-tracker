import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStaleWhileLoading } from '@/hooks/useStaleWhileLoading';
import { PageHeader } from '@/components/common/PageHeader';
import { PageSkeleton } from '@/components/common/PageSkeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { RefreshingDot } from '@/components/common/RefreshingDot';
import { cn } from '@/lib/utils';
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
  const { profile, homegames } = useAuthContext();
  const stats = usePersonalStats();
  const fresh = useMemo(
    () => ({
      homegameStats: stats.homegameStats,
      recentSessions: stats.recentSessions,
      overallStats: stats.overallStats,
      allSessionHistory: stats.allSessionHistory,
    }),
    [stats.homegameStats, stats.recentSessions, stats.overallStats, stats.allSessionHistory]
  );
  const { data, isFirstLoad, isRefreshing } = useStaleWhileLoading(profile?.id ? `mystats:${profile.id}` : null, fresh, stats.loading);
  const { homegameStats, recentSessions, overallStats, allSessionHistory } = data;

  if (isFirstLoad) return <PageSkeleton rows={3} hero />;

  const hasClaimedPlayers = homegameStats.length > 0;
  const currencies = new Set(homegames.map((h) => h.currency || '$'));
  const cur = currencies.size === 1 ? [...currencies][0] : '';

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={profile?.username ? `${profile.username}#${profile.discriminator}` : 'You'} title="My stats" action={<RefreshingDot show={isRefreshing} />} />

      {!hasClaimedPlayers ? (
        <EmptyState
          icon={Users}
          title="Claim your player first"
          description="Find your name in Players and tap “This is me”. Once the owner approves it, your results show up here."
          action={
            <Button asChild>
              <Link to="/players">Go to Players</Link>
            </Button>
          }
        />
      ) : (
        <>
          {/* Hero Card */}
          {overallStats && (
            <Card className="relative w-full overflow-hidden">
              <div aria-hidden="true" className="gold-hairline absolute inset-x-6 top-0 h-px" />
              <div className="p-5 sm:p-6">
                <div className="mb-2 flex items-center justify-between">
                  <span className="section-header">Lifetime profit</span>
                  <Badge variant="outline" className="tabular-nums">
                    {overallStats.sessionsPlayed} sessions
                  </Badge>
                </div>
                <div className={`font-display text-[3.25rem] font-semibold leading-none tabular-nums ${overallStats.totalProfit >= 0 ? 'profit' : 'loss'}`}>
                  {formatProfit(overallStats.totalProfit, cur)}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {overallStats.totalProfit >= 0 ? 'You\'re up. Nicely played.' : 'Keep grinding.'}
                </p>
              </div>
              <CardContent className="pt-4 space-y-4">
                {/* Quick stats row */}
                <div className="flex gap-4 overflow-x-auto">
                  <StatPill icon={<Target className="h-4 w-4" />} label="Avg/Session" value={formatProfit(overallStats.avgProfit, cur)} positive={overallStats.avgProfit >= 0} />
                  <StatPill icon={<Flame className="h-4 w-4" />} label="Best Win" value={formatProfit(overallStats.biggestWin, cur)} positive />
                  <StatPill icon={<Wallet className="h-4 w-4" />} label="Buy-ins" value={formatCurrency(overallStats.totalBuyIn, cur)} />
                </div>

                {/* Analytics row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-border/40 pt-4">
                  <AnalyticTile label="Win Rate" value={`${Math.round(overallStats.winRate)}%`} icon={<Activity className="h-3.5 w-3.5" />} positive={overallStats.winRate >= 50} />
                  <AnalyticTile label="Std Dev" value={formatCurrency(Math.round(overallStats.stdDev), cur)} icon={<BarChart2 className="h-3.5 w-3.5" />} />
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
                <div className="space-y-2">
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
              <h2 className="section-header px-1">By homegame</h2>
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
      <div className="p-2 rounded-full bg-gold/10 flex-shrink-0 text-gold">{icon}</div>
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
    <div className="flex flex-col gap-1 rounded-xl border border-border/50 bg-muted/40 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-[0.6875rem] uppercase tracking-[0.1em] font-medium">{label}</span>
      </div>
      <p className={`text-base font-bold tabular-nums ${positive ? 'profit' : negative ? 'loss' : ''}`}>{value}</p>
    </div>
  );
}

function SessionRow({ session }: { session: RecentSession }) {
  const isWin = session.profit >= 0;
  return (
    <div className="flex items-center gap-3 rounded-xl bg-muted/40 p-3">
      <div className={`flex-shrink-0 w-1 h-10 rounded-full ${isWin ? 'bg-success' : 'bg-destructive'}`} />
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
            <p className={`font-display text-[1.6rem] leading-none font-semibold tabular-nums ${isPositive ? 'profit' : 'loss'}`}>
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
              <Award className="h-3.5 w-3.5 text-gold" aria-hidden="true" />
              <p className="text-xs font-medium text-muted-foreground">Badges</p>
            </div>
            <PlayerBadges badges={badges} currency={homegame.currency} size="md" />
          </div>
        )}

        {/* Settlements with transfer tracking */}
        {pendingSettlements.length > 0 && (
          <div className="border-t border-border/40 pt-3">
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <p className="section-header">Settle up</p>
              <p className="text-[0.6875rem] text-muted-foreground">Ticks are saved on this device only</p>
            </div>
            <div className="space-y-2">
              {pendingSettlements.map((settlement, idx) => {
                const isOwing = settlement.from.id === player.id;
                const key = settlementKey(settlement);
                const done = paidSet.has(key);
                return (
                  <div
                    key={idx}
                    className={cn(
                      'flex min-h-[56px] items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm transition-[opacity,background-color]',
                      done ? 'border-border/40 bg-muted/30 opacity-60' : isOwing ? 'border-destructive/25 bg-destructive/[0.06]' : 'border-success/25 bg-success/[0.06]'
                    )}
                  >
                    <div className="flex min-w-0 flex-wrap items-baseline gap-x-2">
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
                      aria-pressed={done}
                      className={cn('shrink-0 gap-1.5 text-xs', done ? 'text-muted-foreground' : isOwing ? 'loss' : 'profit')}
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

import { useAuthContext } from '@/contexts/AuthContext';
import { usePersonalStats } from '@/hooks/usePersonalStats';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  TrendingUp,
  TrendingDown,
  ChevronRight,
  Medal
} from 'lucide-react';
import { formatProfit, formatCurrency } from '@/lib/settlement';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { PokerChipSpade } from '@/components/icons/PokerChipSpade';
import { getIconSrc } from '@/lib/homegameIcons';
import { HomegameWithRole, Settlement } from '@/types/database';

export function DashboardPage() {
  const { profile, homegames, homegame, selectHomegame } = useAuthContext();
  const { homegameStats, recentSessions, overallStats, loading } = usePersonalStats();

  const handleHomegameClick = (hgId: string) => {
    selectHomegame(hgId);
  };

  return (
    <div data-tutorial="tutorial-dashboard" className="space-y-6 max-w-3xl mx-auto">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">
            Welcome back{profile?.display_name ? `, ${profile.display_name}` : ''}
          </h1>
          <p className="text-sm text-muted-foreground">
            {homegames.length} homegame{homegames.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Quick Stats Summary */}
      {loading ? (
        <Card>
          <CardContent className="py-6">
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-6 w-20" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : overallStats && overallStats.sessionsPlayed > 0 ? (
        <Card className="overflow-hidden">
          <div className={`p-4 ${overallStats.totalProfit >= 0 ? 'bg-gradient-to-r from-green-500/10 to-transparent' : 'bg-gradient-to-r from-red-500/10 to-transparent'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {overallStats.totalProfit >= 0 ? (
                  <TrendingUp className="h-5 w-5 text-green-500" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-red-500" />
                )}
                <div>
                  <p className="text-xs text-muted-foreground">Lifetime Profit</p>
                  <p className={`text-xl font-bold tabular-nums ${overallStats.totalProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {formatProfit(overallStats.totalProfit)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">{overallStats.sessionsPlayed} sessions</p>
                <p className={`text-sm font-medium tabular-nums ${overallStats.avgProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {formatProfit(overallStats.avgProfit)}/session
                </p>
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      {/* Homegames Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-medium text-muted-foreground">Your Homegames</h2>
        </div>

        <div className="space-y-2">
          {homegames.map((hg) => (
            <HomegameCard
              key={hg.id}
              homegame={hg}
              isActive={homegame?.id === hg.id}
              stats={homegameStats.find(s => s.homegame.id === hg.id)}
              onClick={() => handleHomegameClick(hg.id)}
              loading={loading}
            />
          ))}
        </div>

        {homegames.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center">
              <PokerChipSpade className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
              <h3 className="font-medium mb-1">No Homegames Yet</h3>
              <p className="text-sm text-muted-foreground">
                Create a homegame or join one with an invite code
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent Activity */}
      {recentSessions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-medium text-muted-foreground">Recent Sessions</h2>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-border/50">
                {recentSessions.slice(0, 5).map((session, idx) => {
                  const isWin = session.profit >= 0;
                  return (
                    <div
                      key={`${session.id}-${idx}`}
                      className="flex items-center justify-between p-3 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-1 h-8 rounded-full flex-shrink-0 ${isWin ? 'bg-green-500' : 'bg-red-500'}`} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{session.homegameName}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(parseISO(session.date), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      <span className={`text-sm font-semibold tabular-nums flex-shrink-0 ${isWin ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {formatProfit(session.profit, session.currency)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

interface HomegameCardProps {
  homegame: HomegameWithRole;
  isActive: boolean;
  stats?: {
    stats: {
      totalProfit: number;
      sessionsPlayed: number;
      avgProfit: number;
    };
    pendingSettlements: Settlement[];
    leaderboardPosition: number | null;
    totalPlayers: number;
  };
  onClick: () => void;
  loading: boolean;
}

function HomegameCard({ homegame, isActive, stats, onClick, loading }: HomegameCardProps) {
  const hasStats = stats && stats.stats.sessionsPlayed > 0;
  const profit = stats?.stats.totalProfit ?? 0;
  const isPositive = profit >= 0;
  const pendingCount = stats?.pendingSettlements.length ?? 0;
  const position = stats?.leaderboardPosition;
  const totalPlayers = stats?.totalPlayers ?? 0;

  return (
    <Card
      className={`cursor-pointer transition-all hover:bg-muted/30 ${isActive ? 'ring-1 ring-primary/50 bg-primary/5' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={getIconSrc(homegame.icon_id)}
              alt={homegame.name}
              className="w-10 h-10 rounded-lg object-cover flex-shrink-0 shadow-[0_0_10px_rgba(200,155,60,0.35)]"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold truncate">{homegame.name}</h3>
                {isActive && (
                  <Badge variant="secondary" className="text-[10px] h-4 px-1.5">Active</Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-normal capitalize">
                  {homegame.role}
                </Badge>
                {loading ? (
                  <Skeleton className="h-3 w-16" />
                ) : hasStats ? (
                  <span>{stats.stats.sessionsPlayed} sessions</span>
                ) : (
                  <span>No sessions yet</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {loading ? (
              <Skeleton className="h-5 w-14" />
            ) : hasStats ? (
              <div className="flex items-center gap-3">
                {position && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Medal className="h-3.5 w-3.5" />
                    <span className="tabular-nums">{position}/{totalPlayers}</span>
                  </div>
                )}
                <div className="text-right">
                  <p className={`text-sm font-semibold tabular-nums ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {formatProfit(profit, homegame.currency)}
                  </p>
                  {pendingCount > 0 && (
                    <p className="text-[10px] text-amber-600 dark:text-amber-400">
                      {pendingCount} pending
                    </p>
                  )}
                </div>
              </div>
            ) : null}
            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

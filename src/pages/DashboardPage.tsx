import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { usePersonalStats } from '@/hooks/usePersonalStats';
import { useStaleWhileLoading } from '@/hooks/useStaleWhileLoading';
import { useLiveSession } from '@/contexts/LiveSessionContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  Calculator,
  CalendarDays,
  ChevronRight,
  HandCoins,
  Medal,
  NotebookPen,
  Radio,
  Trophy,
  UserPlus,
  Users,
} from 'lucide-react';
import { formatProfit } from '@/lib/settlement';
import { parseISO, formatDistanceToNow } from 'date-fns';
import { getIconSrc } from '@/lib/homegameIcons';
import { HomegameWithRole, Settlement } from '@/types/database';
import { LiveSessionCard } from '@/components/sessions/LiveSessionCard';
import { RefreshingDot } from '@/components/common/RefreshingDot';
import { cn } from '@/lib/utils';
import { greeting } from '@/lib/greeting';
import { NoHomegameHome } from '@/components/home/NoHomegameHome';
import { GettingStartedCard } from '@/components/home/GettingStartedCard';
import { useGettingStarted } from '@/hooks/useGettingStarted';

export function DashboardPage() {
  const { homegame } = useAuthContext();
  return homegame ? <HomegameDashboard /> : <NoHomegameHome />;
}

function HomegameDashboard() {
  const { profile, homegames, homegame, isOwner, selectHomegame } = useAuthContext();
  const stats = usePersonalStats();
  const { liveSession } = useLiveSession();
  const { checklist, onInviteShared } = useGettingStarted(homegame?.id);

  const live = useMemo(
    () => ({ homegameStats: stats.homegameStats, recentSessions: stats.recentSessions, overallStats: stats.overallStats }),
    [stats.homegameStats, stats.recentSessions, stats.overallStats]
  );
  const { data, isFirstLoad, isRefreshing } = useStaleWhileLoading(profile?.id ? `dash:${profile.id}` : null, live, stats.loading);
  const { homegameStats, recentSessions, overallStats } = data;

  // Lifetime figures span every homegame; only show a symbol when they share one.
  const currencies = new Set(homegames.map((h) => h.currency || '$'));
  const overallCurrency = currencies.size === 1 ? [...currencies][0] : '';

  const currentStats = homegameStats.find((s) => s.homegame.id === homegame?.id);
  const pending = currentStats?.pendingSettlements.length ?? 0;

  return (
    <div data-tutorial="tutorial-dashboard" className="space-y-6">
      <header className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="section-header mb-1">{greeting()}</p>
          <h1 className="page-title truncate">{profile?.display_name || profile?.username || 'Welcome back'}</h1>
        </div>
        <RefreshingDot show={isRefreshing} />
      </header>

      <LiveSessionCard />

      {homegame && checklist.visible && (
        <GettingStartedCard
          homegameId={homegame.id}
          homegameName={homegame.name}
          checklist={checklist}
          onInviteShared={onInviteShared}
        />
      )}

      {/* Lifetime hero */}
      {isFirstLoad ? (
        <Skeleton className="h-[148px] w-full rounded-xl" />
      ) : overallStats && overallStats.sessionsPlayed > 0 ? (
        <Link
          to="/my-stats"
          className="surface pressable group relative block overflow-hidden p-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div aria-hidden="true" className="gold-hairline absolute inset-x-6 top-0 h-px" />
          <p className="section-header">Lifetime</p>
          <p
            className={cn(
              'font-display mt-1 text-[2.9rem] font-semibold leading-none tabular-nums',
              overallStats.totalProfit >= 0 ? 'profit' : 'loss'
            )}
          >
            {formatProfit(overallStats.totalProfit, overallCurrency)}
          </p>
          <div className="mt-4 flex items-center gap-4 text-[0.8125rem] text-muted-foreground">
            <span>
              <span className="font-semibold text-foreground tabular-nums">{overallStats.sessionsPlayed}</span> sessions
            </span>
            <span className="h-3 w-px bg-border" aria-hidden="true" />
            <span className="tabular-nums">
              <span className={cn('font-semibold', overallStats.avgProfit >= 0 ? 'profit' : 'loss')}>
                {formatProfit(overallStats.avgProfit, overallCurrency)}
              </span>{' '}
              / session
            </span>
            <span className="ml-auto flex items-center gap-1 font-medium text-gold">
              Stats <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </span>
          </div>
        </Link>
      ) : null}

      {/* Primary actions */}
      {!liveSession && (
        <div className="grid grid-cols-2 gap-3">
          <Link
            to="/live-session"
            className="pressable gold-fill flex min-h-[88px] flex-col justify-between rounded-xl p-4 text-primary-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Radio className="h-5 w-5" aria-hidden="true" />
            <span>
              <span className="block text-[0.9375rem] font-semibold leading-tight">Start live game</span>
              <span className="text-xs opacity-75">Track buy-ins as you play</span>
            </span>
          </Link>
          <Link
            to="/new-session"
            className="surface pressable flex min-h-[88px] flex-col justify-between p-4 hover:border-gold/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <NotebookPen className="h-5 w-5 text-gold" aria-hidden="true" />
            <span>
              <span className="block text-[0.9375rem] font-semibold leading-tight">Log a result</span>
              <span className="text-xs text-muted-foreground">Game already finished</span>
            </span>
          </Link>
        </div>
      )}

      {/* Shortcuts */}
      <nav aria-label="Shortcuts" className="grid grid-cols-4 gap-2">
        <Shortcut to="/leaderboard" icon={Trophy} label="Standings" />
        <Shortcut to="/sessions" icon={CalendarDays} label="Sessions" />
        <Shortcut to="/players" icon={Users} label="Players" />
        {isOwner ? (
          <Shortcut to="/invites" icon={UserPlus} label="Invite" />
        ) : (
          <Shortcut to="/calculator" icon={Calculator} label="Calc" />
        )}
      </nav>

      {pending > 0 && (
        <Link
          to="/my-stats"
          className="pressable flex min-h-[64px] items-center gap-3 rounded-xl border border-gold/35 bg-gold/[0.07] px-4 py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gold/25 bg-gold/10">
            <HandCoins className="h-5 w-5 text-gold" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1 text-sm">
            <span className="block font-semibold">Settlements to clear</span>
            <span className="block truncate text-xs text-muted-foreground">in {homegame?.name}</span>
          </span>
          <span className="flex shrink-0 items-baseline gap-1.5">
            <span className="font-display text-[1.75rem] font-semibold leading-none tabular-nums text-gold">{pending}</span>
            <span className="text-xs text-muted-foreground">open</span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-gold" aria-hidden="true" />
        </Link>
      )}

      {/* Homegames */}
      <section className="space-y-3" aria-labelledby="hg-title">
        <h2 id="hg-title" className="section-header px-1">
          Your homegames
        </h2>
        <div className="space-y-2">
          {homegames.map((hg) => (
            <HomegameCard
              key={hg.id}
              homegame={hg}
              isActive={homegame?.id === hg.id}
              stats={homegameStats.find((s) => s.homegame.id === hg.id)}
              onSelect={() => selectHomegame(hg.id)}
              loading={isFirstLoad}
            />
          ))}
        </div>
      </section>

      {/* Recent activity */}
      {recentSessions.length > 0 && (
        <section className="space-y-3" aria-labelledby="recent-title">
          <div className="flex items-center justify-between px-1">
            <h2 id="recent-title" className="section-header">
              Recent results
            </h2>
            <Link to="/sessions" className="flex min-h-[44px] items-center gap-1 text-[0.8125rem] font-medium text-gold">
              All sessions <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          <ul className="surface divide-y divide-border/50 overflow-hidden p-0">
            {recentSessions.slice(0, 5).map((session, idx) => {
              const isWin = session.profit >= 0;
              return (
                <li key={`${session.id}-${idx}`}>
                  <Link
                    to="/sessions"
                    className="flex min-h-[60px] items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-accent/50 focus:outline-none focus-visible:bg-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className={cn('h-8 w-1 shrink-0 rounded-full', isWin ? 'bg-success' : 'bg-destructive')} aria-hidden="true" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{session.homegameName}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(parseISO(session.date), { addSuffix: true })}
                        </span>
                      </span>
                    </span>
                    <span className={cn('shrink-0 text-sm font-semibold tabular-nums', isWin ? 'profit' : 'loss')}>
                      {formatProfit(session.profit, session.currency)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

function Shortcut({ to, icon: Icon, label }: { to: string; icon: typeof Trophy; label: string }) {
  return (
    <Link
      to={to}
      className="surface pressable flex min-h-[72px] flex-col items-center justify-center gap-1.5 px-1 text-xs font-medium hover:border-gold/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Icon className="h-5 w-5 text-gold" aria-hidden="true" />
      {label}
    </Link>
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
  onSelect: () => void;
  loading: boolean;
}

function HomegameCard({ homegame, isActive, stats, onSelect, loading }: HomegameCardProps) {
  const hasStats = stats && stats.stats.sessionsPlayed > 0;
  const profit = stats?.stats.totalProfit ?? 0;
  const pendingCount = stats?.pendingSettlements.length ?? 0;
  const position = stats?.leaderboardPosition;
  const totalPlayers = stats?.totalPlayers ?? 0;

  const body = (
    <>
      <img
        src={getIconSrc(homegame.icon_id)}
        alt=""
        className="h-11 w-11 shrink-0 rounded-[10px] object-cover ring-1 ring-gold/30"
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate font-semibold">{homegame.name}</span>
        </span>
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="capitalize">{homegame.role}</span>
          <span aria-hidden="true">·</span>
          {loading ? (
            <Skeleton className="h-3 w-16" />
          ) : hasStats ? (
            <span className="tabular-nums">{stats.stats.sessionsPlayed} sessions</span>
          ) : (
            <span>No sessions yet</span>
          )}
          {position && !loading && (
            <>
              <span aria-hidden="true">·</span>
              <span className="flex items-center gap-0.5 tabular-nums">
                <Medal className="h-3 w-3" aria-hidden="true" />
                {position}/{totalPlayers}
              </span>
            </>
          )}
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        {loading ? (
          <Skeleton className="h-5 w-14" />
        ) : hasStats ? (
          <span className={cn('text-sm font-semibold tabular-nums', profit >= 0 ? 'profit' : 'loss')}>
            {formatProfit(profit, homegame.currency)}
          </span>
        ) : null}
        {isActive ? (
          <span className="rounded-full border border-gold/40 bg-gold/10 px-2 py-0.5 text-[0.6875rem] font-semibold text-gold">Current</span>
        ) : pendingCount > 0 ? (
          <span className="text-[0.6875rem] font-medium text-gold">{pendingCount} pending</span>
        ) : (
          <span className="text-[0.6875rem] font-medium text-muted-foreground">Switch</span>
        )}
      </span>
    </>
  );

  if (isActive) {
    return <div className="surface flex items-center gap-3 border-gold/35 p-3.5">{body}</div>;
  }
  return (
    <button
      onClick={onSelect}
      className="surface pressable flex w-full items-center gap-3 p-3.5 text-left hover:border-gold/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={`Switch to ${homegame.name}`}
    >
      {body}
    </button>
  );
}

import { NavLink } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { Users, CalendarDays, Plus, Trophy, Calculator, Home, Play, LineChart } from 'lucide-react';
import { useLiveSession } from '@/contexts/LiveSessionContext';
import { useIsDesktop } from '@/hooks/useMediaQuery';

const desktopItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/sessions', icon: CalendarDays, label: 'Sessions', tutorial: 'tutorial-nav-sessions' },
  { to: '/leaderboard', icon: Trophy, label: 'Standings', tutorial: 'tutorial-nav-standings' },
  { to: '/players', icon: Users, label: 'Players', tutorial: 'tutorial-nav-players' },
  { to: '/my-stats', icon: LineChart, label: 'My Stats', tutorial: 'tutorial-nav-stats' },
  { to: '/calculator', icon: Calculator, label: 'Calculator' },
];

// Mobile tab bar: 4 destinations + the centre action (skill rule: bottom nav ≤ 5).
// Players lives in the header, Calculator in the Club sheet and on Home.
const mobileLeft = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/sessions', icon: CalendarDays, label: 'Sessions', tutorial: 'tutorial-nav-sessions' },
];
const mobileRight = [
  { to: '/leaderboard', icon: Trophy, label: 'Standings', tutorial: 'tutorial-nav-standings' },
  { to: '/my-stats', icon: LineChart, label: 'Stats', tutorial: 'tutorial-nav-stats' },
];

type Item = (typeof desktopItems)[number];

function TabItem({ item }: { item: Item }) {
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      data-tutorial={item.tutorial}
      className="group flex flex-1 flex-col items-center justify-center focus:outline-none"
    >
      {({ isActive }) => (
        <span
          className={cn(
            'pressable flex min-h-[48px] min-w-[56px] flex-col items-center justify-center gap-1 rounded-xl px-2 group-focus-visible:ring-2 group-focus-visible:ring-ring',
            isActive ? 'text-gold' : 'text-muted-foreground'
          )}
        >
          <span className="relative">
            <item.icon
              className={cn('h-[22px] w-[22px] transition-transform duration-200', isActive && 'drop-shadow-[0_0_8px_hsl(var(--gold)/0.65)]')}
              strokeWidth={isActive ? 2.25 : 1.75}
              aria-hidden="true"
            />
          </span>
          <span className={cn('text-[0.6875rem] leading-none', isActive ? 'font-semibold' : 'font-medium')}>{item.label}</span>
          <span
            aria-hidden="true"
            className={cn('h-[3px] w-5 rounded-full bg-gold transition-opacity duration-200', isActive ? 'opacity-100' : 'opacity-0')}
          />
        </span>
      )}
    </NavLink>
  );
}

export function Navigation() {
  const { liveSession } = useLiveSession();
  const isDesktop = useIsDesktop();
  const isLive = !!liveSession;
  const centreTo = isLive ? '/live-session' : '/new-session';

  const mobile = (
    <nav
      aria-label="Primary"
      className="glass fixed inset-x-0 bottom-0 z-50 border-t border-gold/15 pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]"
    >
      <div className="mx-auto flex h-[var(--tabbar-h)] max-w-lg items-center">
        {mobileLeft.map((item) => (
          <TabItem key={item.to} item={item} />
        ))}

        <div className="flex flex-1 justify-center">
          <NavLink
            to={centreTo}
            data-tutorial="tutorial-new-session"
            aria-label={isLive ? 'Open live game' : 'New session'}
            className="group -mt-6 flex flex-col items-center gap-1 focus:outline-none"
          >
            <span
              className={cn(
                'pressable gold-fill relative flex h-14 w-14 items-center justify-center rounded-full text-primary-foreground ring-4 ring-background group-focus-visible:ring-ring',
                isLive && 'shadow-[0_0_0_0_hsl(var(--gold)/0.5),0_8px_26px_-6px_hsl(var(--gold)/0.8)]'
              )}
            >
              {isLive && (
                <span className="absolute inset-0 animate-ping rounded-full bg-gold/25 [animation-duration:2s]" aria-hidden="true" />
              )}
              {isLive ? (
                <Play className="relative h-6 w-6 translate-x-[1px] fill-current" aria-hidden="true" />
              ) : (
                <Plus className="h-7 w-7" strokeWidth={2.5} aria-hidden="true" />
              )}
            </span>
            <span className={cn('text-[0.6875rem] font-semibold leading-none', isLive ? 'text-gold' : 'text-muted-foreground')}>
              {isLive ? 'Live' : 'New'}
            </span>
          </NavLink>
        </div>

        {mobileRight.map((item) => (
          <TabItem key={item.to} item={item} />
        ))}
      </div>
    </nav>
  );

  const desktop = (
    <nav
      aria-label="Primary"
      className="fixed bottom-0 left-0 top-[calc(3.5rem+env(safe-area-inset-top))] z-40 flex w-60 flex-col gap-1 border-r border-border/60 bg-sidebar/80 p-3"
    >
      <NavLink
        to={centreTo}
        data-tutorial="tutorial-new-session"
        className="pressable gold-fill mb-3 flex h-12 items-center justify-center gap-2 rounded-xl text-sm font-semibold text-primary-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {isLive ? <Play className="h-4 w-4 fill-current" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
        <span>{isLive ? 'Back to live game' : 'New session'}</span>
      </NavLink>
      {desktopItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          data-tutorial={item.tutorial}
          className={({ isActive }) =>
            cn(
              'relative flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              isActive ? 'bg-gold/10 text-gold' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            )
          }
        >
          {({ isActive }) => (
            <>
              {isActive && <span className="absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded-r-full bg-gold" aria-hidden="true" />}
              <item.icon className="h-[18px] w-[18px]" aria-hidden="true" />
              <span>{item.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );

  const nav = isDesktop ? desktop : mobile;
  if (typeof document === 'undefined') return nav;
  return createPortal(nav, document.body);
}

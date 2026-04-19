import { NavLink } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { Users, Calendar, BarChart3, Plus, Trophy, Calculator, LayoutDashboard } from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/sessions', icon: Calendar, label: 'Sessions', 'data-tutorial': 'tutorial-nav-sessions' },
  { to: '/leaderboard', icon: BarChart3, label: 'Standings', 'data-tutorial': 'tutorial-nav-standings' },
  { to: '/players', icon: Users, label: 'Players', 'data-tutorial': 'tutorial-nav-players' },
  { to: '/my-stats', icon: Trophy, label: 'My Stats', 'data-tutorial': 'tutorial-nav-stats' },
  { to: '/calculator', icon: Calculator, label: 'Calculator' },
];

// Mobile bottom nav items - 3 on each side of the center plus button
const mobileNavLeft = [
  { to: '/', icon: LayoutDashboard, label: 'Home' },
  { to: '/sessions', icon: Calendar, label: 'Sessions', 'data-tutorial': 'tutorial-nav-sessions' },
  { to: '/players', icon: Users, label: 'Players', 'data-tutorial': 'tutorial-nav-players' },
];

const mobileNavRight = [
  { to: '/leaderboard', icon: BarChart3, label: 'Standings', 'data-tutorial': 'tutorial-nav-standings' },
  { to: '/my-stats', icon: Trophy, label: 'Stats', 'data-tutorial': 'tutorial-nav-stats' },
  { to: '/calculator', icon: Calculator, label: 'Calc' },
];

export function Navigation() {
  const nav = (
    <nav className="fixed bottom-[6px] left-0 right-0 border-t z-50 bg-[rgb(10,13,24)] border-[rgba(200,155,60,0.22)] shadow-[0_-4px_28px_rgba(200,155,60,0.07)] rounded-b-[2rem] md:bottom-0 md:rounded-none md:top-12 md:right-auto md:border-t-0 md:border-r md:border-border/50 md:h-[calc(100dvh-3rem)] md:w-56 md:bg-background md:shadow-none">
      {/* Mobile navigation */}
      <div className="flex md:hidden items-center justify-around">
        {mobileNavLeft.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            data-tutorial={item['data-tutorial']}
            className="flex-1 flex flex-col items-center justify-center min-h-[44px] py-1 transition-all duration-150"
          >
            {({ isActive }) => (
              <div className={cn(
                'flex flex-col items-center gap-0.5 px-1.5 py-1 rounded-[9px] transition-all duration-150',
                isActive ? 'bg-gold/15' : ''
              )}>
                <item.icon className={cn(
                  'h-5 w-5',
                  isActive
                    ? 'text-gold drop-shadow-[0_0_6px_rgba(200,155,60,0.6)]'
                    : 'text-[rgba(237,232,216,0.55)]'
                )} />
                <span className={cn(
                  'text-[10px]',
                  isActive ? 'text-gold font-bold' : 'text-[rgba(237,232,216,0.55)] font-medium'
                )}>{item.label}</span>
              </div>
            )}
          </NavLink>
        ))}

        {/* Center Plus Button */}
        <NavLink
          to="/new-session"
          data-tutorial="tutorial-new-session"
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center justify-center -mt-5 transition-all duration-150',
              isActive ? 'scale-105' : ''
            )
          }
        >
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gold text-background ring-2 ring-gold/20 shadow-[0_6px_22px_rgba(200,155,60,0.55)]">
            <Plus className="h-6 w-6" strokeWidth={2.5} />
          </div>
        </NavLink>
        
        {mobileNavRight.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            data-tutorial={item['data-tutorial']}
            className="flex-1 flex flex-col items-center justify-center min-h-[44px] py-1 transition-all duration-150"
          >
            {({ isActive }) => (
              <div className={cn(
                'flex flex-col items-center gap-0.5 px-1.5 py-1 rounded-[9px] transition-all duration-150',
                isActive ? 'bg-gold/15' : ''
              )}>
                <item.icon className={cn(
                  'h-5 w-5',
                  isActive
                    ? 'text-gold drop-shadow-[0_0_6px_rgba(200,155,60,0.6)]'
                    : 'text-[rgba(237,232,216,0.55)]'
                )} />
                <span className={cn(
                  'text-[10px]',
                  isActive ? 'text-gold font-bold' : 'text-[rgba(237,232,216,0.55)] font-medium'
                )}>{item.label}</span>
              </div>
            )}
          </NavLink>
        ))}
      </div>

      {/* Desktop navigation */}
      <div className="hidden md:flex md:flex-col md:p-3 md:gap-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            data-tutorial={item['data-tutorial']}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 py-2 px-3 text-sm font-medium transition-all duration-150 rounded-md',
                isActive
                  ? 'text-gold bg-muted/50'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
              )
            }
          >
            <item.icon className="h-4 w-4" />
            <span>{item.label}</span>
          </NavLink>
        ))}
        
        {/* New Session button for desktop */}
        <NavLink
          to="/new-session"
          data-tutorial="tutorial-new-session"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2.5 py-2 px-3 text-sm font-medium transition-all duration-150 rounded-md mt-2 bg-gold/10 border border-gold/20',
              isActive
                ? 'text-gold bg-gold/20'
                : 'text-gold hover:bg-gold/20'
            )
          }
        >
          <Plus className="h-4 w-4" />
          <span>New Session</span>
        </NavLink>
      </div>
    </nav>
  );

  if (typeof document === 'undefined') return nav;
  return createPortal(nav, document.body);
}

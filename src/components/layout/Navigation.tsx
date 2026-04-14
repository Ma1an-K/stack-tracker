import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Users, Calendar, BarChart3, Plus, Trophy, Calculator, LayoutDashboard } from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/sessions', icon: Calendar, label: 'Sessions' },
  { to: '/leaderboard', icon: BarChart3, label: 'Standings' },
  { to: '/players', icon: Users, label: 'Players' },
  { to: '/my-stats', icon: Trophy, label: 'My Stats' },
  { to: '/calculator', icon: Calculator, label: 'Calculator' },
];

// Mobile bottom nav items - 3 on each side of the center plus button
const mobileNavLeft = [
  { to: '/', icon: LayoutDashboard, label: 'Home' },
  { to: '/sessions', icon: Calendar, label: 'Sessions' },
  { to: '/players', icon: Users, label: 'Players' },
];

const mobileNavRight = [
  { to: '/leaderboard', icon: BarChart3, label: 'Standings' },
  { to: '/my-stats', icon: Trophy, label: 'Stats' },
  { to: '/calculator', icon: Calculator, label: 'Calc' },
];

export function Navigation() {
  return (
    <nav className="shrink-0 border-t border-border/50 bg-card z-50 pb-[env(safe-area-inset-bottom)] md:fixed md:top-12 md:left-0 md:bottom-0 md:right-auto md:border-t-0 md:border-r md:border-border/50 md:h-[calc(100dvh-3rem)] md:w-56 md:bg-background md:pb-0">
      {/* Mobile navigation */}
      <div className="flex md:hidden items-center justify-around">
        {mobileNavLeft.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-all duration-150 min-h-[44px]',
                isActive
                  ? 'text-gold'
                  : 'text-muted-foreground hover:text-foreground'
              )
            }
          >
            <item.icon className="h-5 w-5" />
            <span>{item.label}</span>
          </NavLink>
        ))}
        
        {/* Center Plus Button */}
        <NavLink
          to="/new-session"
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center justify-center -mt-5 transition-all duration-150',
              isActive ? 'scale-105' : ''
            )
          }
        >
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gold text-background shadow-lg shadow-gold/30">
            <Plus className="h-6 w-6" strokeWidth={2.5} />
          </div>
        </NavLink>
        
        {mobileNavRight.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-all duration-150 min-h-[44px]',
                isActive
                  ? 'text-gold'
                  : 'text-muted-foreground hover:text-foreground'
              )
            }
          >
            <item.icon className="h-5 w-5" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>

      {/* Desktop navigation */}
      <div className="hidden md:flex md:flex-col md:p-3 md:gap-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
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
}

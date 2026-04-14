import { ReactNode } from 'react';
import { Header } from './Header';
import { Navigation } from './Navigation';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="h-[100dvh] bg-background relative">
      <Header />
      <Navigation />
      {/* main is the ONLY scroll container — keeps fixed header/nav truly
          fixed to the viewport and prevents the iOS Safari momentum-scroll
          drift bug that pushes the bottom nav off-screen. */}
      <main
        className="absolute inset-0 overflow-y-auto overscroll-none md:pb-6 md:ml-56"
        // Inline styles for safe-area calcs — Tailwind JIT misparses env() with commas
        style={{
          paddingTop: 'calc(3rem + env(safe-area-inset-top, 0px))',
          paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))',
          WebkitOverflowScrolling: 'touch',
        } as React.CSSProperties}
      >
        <div className="px-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] py-4 md:p-6 min-h-full">
          {children}
        </div>
      </main>
    </div>
  );
}

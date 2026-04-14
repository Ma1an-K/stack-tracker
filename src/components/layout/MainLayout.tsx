import { ReactNode } from 'react';
import { Header } from './Header';
import { Navigation } from './Navigation';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    // Mobile: flex column — nav is a natural flex item pinned at the bottom
    // of the OS-controlled layout edge. Avoids position:fixed iOS clipping bugs.
    // Desktop (md:): block layout with fixed header/sidebar as before.
    <div className="flex flex-col h-[100dvh] md:block md:relative bg-background">
      <Header />
      {/* Scrollable content area — flex-1 fills space between fixed header and nav */}
      <main
        className="flex-1 min-h-0 overflow-y-auto overscroll-none md:absolute md:inset-0 md:pb-6 md:ml-56"
        style={{
          paddingTop: 'calc(3rem + env(safe-area-inset-top, 0px))',
          WebkitOverflowScrolling: 'touch',
        } as React.CSSProperties}
      >
        <div className="px-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] py-4 md:p-6 min-h-full">
          {children}
        </div>
      </main>
      {/* Nav after main — sits at the bottom of the flex column on mobile,
          fixed sidebar on desktop (md:fixed takes it out of flex flow) */}
      <Navigation />
    </div>
  );
}

import { ReactNode } from 'react';
import { Header } from './Header';
import { Navigation } from './Navigation';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="h-[100dvh] bg-background relative overflow-hidden">
      <Header />
      <Navigation />
      {/* main is the ONLY scroll container — keeps fixed header/nav truly
          fixed to the viewport and prevents the iOS Safari momentum-scroll
          drift bug that pushes the bottom nav off-screen. */}
      <main
        className={[
          'absolute inset-0 overflow-y-auto overscroll-none',
          'pt-[calc(3rem+env(safe-area-inset-top))]',
          'pb-[calc(5rem+env(safe-area-inset-bottom))]',
          'md:pb-6 md:ml-56',
        ].join(' ')}
        // Smooth momentum scroll on iOS without sharing the root scroll layer
        style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
      >
        <div className="p-4 md:p-6 min-h-full">
          {children}
        </div>
      </main>
    </div>
  );
}

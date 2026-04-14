import { ReactNode } from 'react';
import { Header } from './Header';
import { Navigation } from './Navigation';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    // Mobile: flex column — nav is a natural flex item at the OS layout edge.
    // Sidesteps position:fixed iOS PWA clipping issues entirely.
    // Desktop (md:): block + relative, header/sidebar use fixed positioning.
    <div className="flex flex-col h-[100dvh] md:block md:relative bg-background">
      <Header />
      {/* flex-1 fills space between fixed header (z-50) and nav flex-item below.
          paddingTop clears the fixed header; Tailwind JIT handles safe-area without
          a comma fallback so the class is generated correctly. */}
      <main
        className="flex-1 min-h-0 overflow-y-auto overscroll-none pt-[calc(3rem+env(safe-area-inset-top))] md:absolute md:inset-0 md:pt-[calc(3rem+env(safe-area-inset-top))] md:pb-6 md:ml-56"
        style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
      >
        <div className="px-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] py-4 md:p-6 min-h-full">
          {children}
        </div>
      </main>
      {/* Nav is last in flex column on mobile (sits flush at layout bottom),
          md:fixed takes it out of the flex flow for the desktop sidebar. */}
      <Navigation />
    </div>
  );
}

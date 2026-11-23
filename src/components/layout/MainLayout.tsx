import { ReactNode, useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { Header } from './Header';
import { Navigation } from './Navigation';
import { useAuthContext } from '@/contexts/AuthContext';
import { useTutorialContext } from '@/contexts/TutorialContext';
import { TutorialOverlay } from '@/components/tutorial/TutorialOverlay';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { LiveSessionProvider } from '@/contexts/LiveSessionContext';
import { LiveSessionBar } from '@/components/sessions/LiveSessionBar';

interface MainLayoutProps {
  children: ReactNode;
}

// Scroll offsets per path, so Back returns to where you were and a fresh tab
// always opens at the top (the <main> element is the shared scroll container).
const scrollMemory = new Map<string, number>();

export function MainLayout({ children }: MainLayoutProps) {
  const { homegame, currentHomegame, loading } = useAuthContext();
  const { activeTour, currentStep, steps, startTour, nextStep, skipTour } = useTutorialContext();
  const installPrompt = useInstallPrompt();
  const { pathname } = useLocation();
  const navType = useNavigationType();
  const mainRef = useRef<HTMLElement>(null);
  const lastPath = useRef(pathname);

  useEffect(() => {
    if (loading || !homegame || !currentHomegame) return;
    if (currentHomegame.role !== 'owner') {
      startTour('player');
    }
  }, [loading, homegame, currentHomegame, startTour]);

  useLayoutEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    if (lastPath.current !== pathname) {
      scrollMemory.set(lastPath.current, el.scrollTop);
      lastPath.current = pathname;
    }
    el.scrollTop = navType === 'POP' ? scrollMemory.get(pathname) ?? 0 : 0;
  }, [pathname, navType]);

  return (
    <LiveSessionProvider>
      <div className="flex flex-col h-full overflow-x-hidden md:block md:relative bg-background">
        <div aria-hidden="true" className="pointer-events-none fixed -left-24 -top-24 z-0 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,hsl(var(--gold)/0.09)_0%,transparent_65%)]" />
        <div aria-hidden="true" className="pointer-events-none fixed -right-20 bottom-10 z-0 h-[320px] w-[320px] rounded-full bg-[radial-gradient(circle,hsl(var(--gold)/0.05)_0%,transparent_65%)]" />
        <Header />
        <main
          ref={mainRef}
          className="relative z-[1] flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-none pt-[calc(var(--header-h)+env(safe-area-inset-top))] main-pb md:absolute md:inset-0 md:ml-60"
          style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
        >
          <div className="pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-4 md:px-8 md:pt-8 min-h-full">
            <LiveSessionBar />
            <div key={pathname} className={`page-enter mx-auto w-full ${pathname === '/calculator' ? 'max-w-5xl' : 'max-w-3xl'}`}>
              {children}
            </div>
          </div>
        </main>
      </div>
      <Navigation />

      {activeTour && (
        <TutorialOverlay
          steps={steps}
          currentStep={currentStep}
          onNext={nextStep}
          onSkip={skipTour}
          installPrompt={installPrompt}
        />
      )}
    </LiveSessionProvider>
  );
}

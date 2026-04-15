import { ReactNode, useEffect } from 'react';
import { Header } from './Header';
import { Navigation } from './Navigation';
import { useAuthContext } from '@/contexts/AuthContext';
import { useTutorialContext } from '@/contexts/TutorialContext';
import { TutorialOverlay } from '@/components/tutorial/TutorialOverlay';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { homegame, currentHomegame, loading } = useAuthContext();
  const { activeTour, currentStep, steps, startTour, nextStep, skipTour } = useTutorialContext();
  const installPrompt = useInstallPrompt();

  useEffect(() => {
    if (loading || !homegame || !currentHomegame) return;
    if (currentHomegame.role !== 'owner') {
      startTour('player');
    }
  }, [loading, homegame, currentHomegame, startTour]);

  return (
    <div className="flex flex-col h-full md:block md:relative bg-background">
      <div style={{ position: 'fixed', top: -80, left: -80, width: 380, height: 380, background: 'radial-gradient(circle, rgba(200,155,60,0.08) 0%, transparent 65%)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', bottom: 40, right: -60, width: 300, height: 300, background: 'radial-gradient(circle, rgba(200,155,60,0.05) 0%, transparent 65%)', pointerEvents: 'none', zIndex: 0 }} />
      <Header />
      <main
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-none pt-[calc(3rem+env(safe-area-inset-top))] md:absolute md:inset-0 md:pt-[calc(3rem+env(safe-area-inset-top))] md:pb-6 md:ml-56"
        style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
      >
        <div className="px-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] py-4 md:p-6 min-h-full">
          {children}
        </div>
      </main>
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
    </div>
  );
}

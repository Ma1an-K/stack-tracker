# Install Prompt Tutorial Step Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a platform-aware "Add to Home Screen" step as the final step of both onboarding tutorial tours.

**Architecture:** A `useInstallPrompt` hook captures the `beforeinstallprompt` event (Android) and detects iOS/standalone. `TutorialOverlay` receives the hook result and renders a centered install card for the `tutorial-install` sentinel step, silently skipping it on desktop/already-installed. Both tour configs get the new step appended. `MainLayout` wires the hook to the overlay.

**Tech Stack:** React hooks, `beforeinstallprompt` Web API, `matchMedia`, Tailwind, shadcn/ui Button

---

### Task 1: useInstallPrompt hook

**Files:**
- Create: `src/hooks/useInstallPrompt.ts`

- [ ] **Step 1: Create the hook**

```ts
// src/hooks/useInstallPrompt.ts
import { useState, useEffect } from 'react';

// BeforeInstallPromptEvent is not in the standard TypeScript DOM lib
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type InstallPlatform = 'android' | 'ios' | 'installed' | 'unsupported';

export interface InstallPromptInfo {
  platform: InstallPlatform;
  trigger: (() => void) | null;
}

export function useInstallPrompt(): InstallPromptInfo {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true;

  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !(window as unknown as { MSStream?: unknown }).MSStream;

  if (isStandalone) return { platform: 'installed', trigger: null };
  if (isIOS) return { platform: 'ios', trigger: null };
  if (deferredPrompt) {
    return {
      platform: 'android',
      trigger: () => {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(() => setDeferredPrompt(null));
      },
    };
  }
  return { platform: 'unsupported', trigger: null };
}
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/Matankimchi/Desktop/Dev/poker_app && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useInstallPrompt.ts
git commit -m "feat: add useInstallPrompt hook for PWA install detection"
```

---

### Task 2: Add install step to both tour configs

**Files:**
- Modify: `src/components/tutorial/tours.ts`

- [ ] **Step 1: Append the install step to both tours**

Add this object as the last entry in both `OWNER_TOUR` and `PLAYER_TOUR`:

```ts
{
  targetId: 'tutorial-install',
  title: 'Add to Home Screen',
  description: 'Install Stack Tracker on your home screen for the best experience — faster loads, full screen, no browser bar.',
},
```

The full updated file:

```ts
// src/components/tutorial/tours.ts
export interface TourStep {
  targetId: string;
  title: string;
  description: string;
}

export const OWNER_TOUR: TourStep[] = [
  {
    targetId: 'tutorial-homegame-icon',
    title: 'Homegame Icon',
    description: 'Tap your homegame icon to change it anytime.',
  },
  {
    targetId: 'tutorial-settings',
    title: 'Settings',
    description: 'All your homegame settings are here — invite codes, manage members, badge toggles.',
  },
  {
    targetId: 'tutorial-new-session',
    title: 'New Session',
    description: 'Tap the gold + to log a new poker session.',
  },
  {
    targetId: 'tutorial-nav-players',
    title: 'Players',
    description: 'Add your crew here before logging sessions.',
  },
  {
    targetId: 'tutorial-nav-sessions',
    title: 'Sessions',
    description: 'View and manage all your recorded sessions here.',
  },
  {
    targetId: 'tutorial-nav-standings',
    title: 'Standings',
    description: "See the leaderboard and who's up or down across all sessions.",
  },
  {
    targetId: 'tutorial-nav-stats',
    title: 'My Stats',
    description: 'Your personal profit chart, badges, and session history.',
  },
  {
    targetId: 'tutorial-install',
    title: 'Add to Home Screen',
    description: 'Install Stack Tracker on your home screen for the best experience — faster loads, full screen, no browser bar.',
  },
];

export const PLAYER_TOUR: TourStep[] = [
  {
    targetId: 'tutorial-dashboard',
    title: 'Dashboard',
    description: 'Your home base — see your overall profit, recent sessions, and homegames at a glance.',
  },
  {
    targetId: 'tutorial-new-session',
    title: 'New Session',
    description: 'Tap the gold + to log a new poker session.',
  },
  {
    targetId: 'tutorial-nav-players',
    title: 'Claim Your Player ⚡',
    description: "Find your name in the Players list and tap Claim. This links your account to your player profile — so all your session results show up under My Stats. Without it, your stats won't appear under your account.",
  },
  {
    targetId: 'tutorial-nav-sessions',
    title: 'Sessions',
    description: 'Browse all recorded sessions and see results.',
  },
  {
    targetId: 'tutorial-nav-standings',
    title: 'Standings',
    description: "See where everyone ranks. Who's up, who's down, and this month's badges.",
  },
  {
    targetId: 'tutorial-nav-stats',
    title: 'My Stats',
    description: 'Your personal profit chart, win rate, badges, and full session history.',
  },
  {
    targetId: 'tutorial-settings',
    title: 'Settings',
    description: 'Edit your profile name and manage notification settings here.',
  },
  {
    targetId: 'tutorial-install',
    title: 'Add to Home Screen',
    description: 'Install Stack Tracker on your home screen for the best experience — faster loads, full screen, no browser bar.',
  },
];
```

- [ ] **Step 2: Commit**

```bash
git add src/components/tutorial/tours.ts
git commit -m "feat: add install step to owner and player tour configs"
```

---

### Task 3: Update TutorialOverlay to handle the install step

**Files:**
- Modify: `src/components/tutorial/TutorialOverlay.tsx`

- [ ] **Step 1: Replace the file with the updated version**

```tsx
// src/components/tutorial/TutorialOverlay.tsx
import { useEffect, useState, useCallback } from 'react';
import { TourStep } from './tours';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { InstallPromptInfo } from '@/hooks/useInstallPrompt';

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface TutorialOverlayProps {
  steps: TourStep[];
  currentStep: number;
  onNext: () => void;
  onSkip: () => void;
  installPrompt: InstallPromptInfo;
}

const PADDING = 6;
const INSTALL_TARGET_ID = 'tutorial-install';

export function TutorialOverlay({ steps, currentStep, onNext, onSkip, installPrompt }: TutorialOverlayProps) {
  const [rect, setRect] = useState<SpotlightRect | null>(null);
  const step = steps[currentStep];
  const isInstallStep = step?.targetId === INSTALL_TARGET_ID;

  // Auto-skip install step on unsupported platforms or already-installed
  useEffect(() => {
    if (
      isInstallStep &&
      (installPrompt.platform === 'installed' || installPrompt.platform === 'unsupported')
    ) {
      onNext();
    }
  }, [isInstallStep, installPrompt.platform, onNext]);

  const measureTarget = useCallback(() => {
    if (!step || isInstallStep) return;
    const el = document.querySelector(`[data-tutorial="${step.targetId}"]`);
    if (!el) {
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [step?.targetId, isInstallStep]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const id = setTimeout(measureTarget, 50);
    window.addEventListener('resize', measureTarget);
    return () => {
      clearTimeout(id);
      window.removeEventListener('resize', measureTarget);
    };
  }, [measureTarget]);

  if (!step) return null;

  // Suppress render while auto-skip effect fires
  if (
    isInstallStep &&
    (installPrompt.platform === 'installed' || installPrompt.platform === 'unsupported')
  ) {
    return null;
  }

  // Install step: full-screen dim + centered card, no spotlight
  if (isInstallStep) {
    const cardW = Math.min(300, window.innerWidth - 24);
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.65)' }}>
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: cardW,
          }}
          className="rounded-xl border border-border bg-card shadow-xl p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-muted-foreground font-medium">
              Step {currentStep + 1} of {steps.length}
            </span>
            <button
              onClick={onSkip}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Skip tutorial"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="font-semibold text-sm mb-2">{step.title}</p>
          {installPrompt.platform === 'android' ? (
            <>
              <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                {step.description}
              </p>
              <Button
                className="w-full text-sm h-9 bg-yellow-500 hover:bg-yellow-400 text-black font-semibold mb-2"
                onClick={() => {
                  installPrompt.trigger?.();
                  onNext();
                }}
              >
                Install App
              </Button>
            </>
          ) : (
            <p className="text-xs text-muted-foreground leading-relaxed mb-4">
              Tap <strong>Share ↑</strong> in your browser, then tap{' '}
              <strong>Add to Home Screen</strong> to install Stack Tracker for the best experience.
            </p>
          )}
          <button
            onClick={onSkip}
            className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors text-center py-1"
          >
            Maybe later
          </button>
        </div>
      </div>
    );
  }

  // Normal spotlight tooltip (unchanged)
  const spotlightTop = rect ? rect.top - PADDING : 0;
  const spotlightLeft = rect ? rect.left - PADDING : 0;
  const spotlightW = rect ? rect.width + PADDING * 2 : 0;
  const spotlightH = rect ? rect.height + PADDING * 2 : 0;

  const viewportH = typeof window !== 'undefined' ? window.innerHeight : 800;
  const viewportW = typeof window !== 'undefined' ? window.innerWidth : 400;
  const tooltipW = Math.min(300, viewportW - 24);

  const spaceBelow = viewportH - (spotlightTop + spotlightH);
  const tooltipBelow = spaceBelow >= 220 || !rect;
  const tooltipTop = rect
    ? tooltipBelow
      ? spotlightTop + spotlightH + 12
      : spotlightTop - 220
    : viewportH / 2 - 110;
  const tooltipLeft = rect
    ? Math.max(12, Math.min(spotlightLeft, viewportW - tooltipW - 12))
    : 12;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200 }}>
      <div
        style={{
          position: 'absolute',
          top: spotlightTop,
          left: spotlightLeft,
          width: spotlightW,
          height: spotlightH,
          borderRadius: 8,
          boxShadow: '0 0 0 9999px rgba(0,0,0,0.65)',
          pointerEvents: 'none',
          transition: 'top 0.2s, left 0.2s, width 0.2s, height 0.2s',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: tooltipTop,
          left: tooltipLeft,
          width: tooltipW,
          transition: 'top 0.2s, left 0.2s',
        }}
        className="rounded-xl border border-border bg-card shadow-xl p-4"
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground font-medium">
            Step {currentStep + 1} of {steps.length}
          </span>
          <button
            onClick={onSkip}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Skip tutorial"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="font-semibold text-sm mb-1">{step.title}</p>
        <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
        <div className="flex items-center justify-between mt-3">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7 px-2 text-muted-foreground"
            onClick={onSkip}
          >
            Skip tour
          </Button>
          <Button
            size="sm"
            className="text-xs h-7 px-3 bg-yellow-500 hover:bg-yellow-400 text-black font-semibold"
            onClick={onNext}
          >
            {currentStep === steps.length - 1 ? 'Got it ✓' : 'Next →'}
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/Matankimchi/Desktop/Dev/poker_app && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/tutorial/TutorialOverlay.tsx
git commit -m "feat: handle install step in TutorialOverlay with platform-aware card"
```

---

### Task 4: Wire useInstallPrompt into MainLayout and push

**Files:**
- Modify: `src/components/layout/MainLayout.tsx`

- [ ] **Step 1: Add import and hook call, pass installPrompt prop**

```tsx
// src/components/layout/MainLayout.tsx
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
    <div className="flex flex-col h-[100dvh] md:block md:relative bg-background">
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
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/Matankimchi/Desktop/Dev/poker_app && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit and push**

```bash
git add src/components/layout/MainLayout.tsx
git commit -m "feat: wire useInstallPrompt into MainLayout and pass to TutorialOverlay"
git push
```

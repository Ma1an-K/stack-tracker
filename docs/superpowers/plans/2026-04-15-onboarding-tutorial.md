# Onboarding Tutorial Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build two first-time tooltip spotlight tours — one for homegame owners (fires after homegame creation) and one for members (fires on first login) — that highlight real UI elements and are never shown twice.

**Architecture:** A `TutorialContext` holds active tour state and localStorage persistence. A `TutorialOverlay` component renders a spotlight cutout + tooltip card over the target element. `data-tutorial` attributes mark each target in the DOM. The owner tour is triggered from `HomegameDialog` after a successful `createHomegame`; the player tour fires from `MainLayout` on mount when the user is a non-owner member with no seen flag.

**Tech Stack:** React context, useState/useEffect, `getBoundingClientRect`, box-shadow spotlight technique, Tailwind, shadcn/ui Button, localStorage

---

### Task 1: Tour step configs

**Files:**
- Create: `src/components/tutorial/tours.ts`

- [ ] **Step 1: Create the file**

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
];
```

- [ ] **Step 2: Commit**

```bash
git add src/components/tutorial/tours.ts
git commit -m "feat: add tutorial tour step configs"
```

---

### Task 2: Tutorial context

**Files:**
- Create: `src/contexts/TutorialContext.tsx`

- [ ] **Step 1: Create the context**

```tsx
// src/contexts/TutorialContext.tsx
import { createContext, useContext, useState, ReactNode } from 'react';
import { TourStep, OWNER_TOUR, PLAYER_TOUR } from '@/components/tutorial/tours';

type TourType = 'owner' | 'player';

interface TutorialContextValue {
  activeTour: TourType | null;
  currentStep: number;
  steps: TourStep[];
  startTour: (type: TourType) => void;
  nextStep: () => void;
  skipTour: () => void;
}

const TutorialContext = createContext<TutorialContextValue | null>(null);

export function TutorialProvider({ children }: { children: ReactNode }) {
  const [activeTour, setActiveTour] = useState<TourType | null>(null);
  const [currentStep, setCurrentStep] = useState(0);

  const steps = activeTour === 'owner' ? OWNER_TOUR : activeTour === 'player' ? PLAYER_TOUR : [];

  const startTour = (type: TourType) => {
    const key = type === 'owner' ? 'tutorial_owner_seen' : 'tutorial_player_seen';
    if (localStorage.getItem(key)) return;
    setActiveTour(type);
    setCurrentStep(0);
  };

  const completeTour = (type: TourType) => {
    const key = type === 'owner' ? 'tutorial_owner_seen' : 'tutorial_player_seen';
    localStorage.setItem(key, '1');
    setActiveTour(null);
    setCurrentStep(0);
  };

  const nextStep = () => {
    if (!activeTour) return;
    if (currentStep >= steps.length - 1) {
      completeTour(activeTour);
    } else {
      setCurrentStep(s => s + 1);
    }
  };

  const skipTour = () => {
    if (activeTour) completeTour(activeTour);
  };

  return (
    <TutorialContext.Provider value={{ activeTour, currentStep, steps, startTour, nextStep, skipTour }}>
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorialContext() {
  const ctx = useContext(TutorialContext);
  if (!ctx) throw new Error('useTutorialContext must be used within TutorialProvider');
  return ctx;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/contexts/TutorialContext.tsx
git commit -m "feat: add TutorialContext for tour state management"
```

---

### Task 3: TutorialOverlay component

**Files:**
- Create: `src/components/tutorial/TutorialOverlay.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/tutorial/TutorialOverlay.tsx
import { useEffect, useState, useCallback } from 'react';
import { TourStep } from './tours';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

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
}

const PADDING = 6;

export function TutorialOverlay({ steps, currentStep, onNext, onSkip }: TutorialOverlayProps) {
  const [rect, setRect] = useState<SpotlightRect | null>(null);
  const step = steps[currentStep];

  const measureTarget = useCallback(() => {
    if (!step) return;
    const el = document.querySelector(`[data-tutorial="${step.targetId}"]`);
    if (!el) {
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [step]);

  useEffect(() => {
    // Small delay so the DOM has settled after step change
    const id = setTimeout(measureTarget, 50);
    window.addEventListener('resize', measureTarget);
    return () => {
      clearTimeout(id);
      window.removeEventListener('resize', measureTarget);
    };
  }, [measureTarget]);

  if (!step) return null;

  const spotlightTop = rect ? rect.top - PADDING : 0;
  const spotlightLeft = rect ? rect.left - PADDING : 0;
  const spotlightW = rect ? rect.width + PADDING * 2 : 0;
  const spotlightH = rect ? rect.height + PADDING * 2 : 0;

  const viewportH = typeof window !== 'undefined' ? window.innerHeight : 800;
  const viewportW = typeof window !== 'undefined' ? window.innerWidth : 400;
  const tooltipW = Math.min(300, viewportW - 24);

  // Prefer below the spotlight, flip above if not enough room
  const spaceBelow = viewportH - (spotlightTop + spotlightH);
  const tooltipBelow = spaceBelow >= 170 || !rect;
  const tooltipTop = rect
    ? tooltipBelow
      ? spotlightTop + spotlightH + 12
      : spotlightTop - 170
    : viewportH / 2 - 85;
  const tooltipLeft = rect
    ? Math.max(12, Math.min(spotlightLeft, viewportW - tooltipW - 12))
    : 12;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200 }}>
      {/* Spotlight: box-shadow creates the darkened overlay, element itself is the transparent cutout */}
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

      {/* Tooltip card */}
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

- [ ] **Step 2: Commit**

```bash
git add src/components/tutorial/TutorialOverlay.tsx
git commit -m "feat: add TutorialOverlay spotlight component"
```

---

### Task 4: Add data-tutorial attributes to DOM elements

**Files:**
- Modify: `src/components/layout/Navigation.tsx`
- Modify: `src/components/layout/Header.tsx`
- Modify: `src/pages/DashboardPage.tsx`

- [ ] **Step 1: Add data-tutorial attrs to Navigation**

In `src/components/layout/Navigation.tsx`, add `data-tutorial` to the mobile nav items and the centre + button. The mobile nav uses `mobileNavLeft` and `mobileNavRight` arrays — add attrs to the matching `NavLink` elements by checking `item.to`:

Replace the mobile NavLink render in both `mobileNavLeft.map` and `mobileNavRight.map`:

```tsx
{mobileNavLeft.map((item) => (
  <NavLink
    key={item.to}
    to={item.to}
    data-tutorial={
      item.to === '/sessions' ? 'tutorial-nav-sessions' :
      item.to === '/players' ? 'tutorial-nav-players' :
      undefined
    }
    className={({ isActive }) =>
      cn(
        'flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-all duration-150 min-h-[44px]',
        isActive ? 'text-gold' : 'text-muted-foreground hover:text-foreground'
      )
    }
  >
    <item.icon className="h-5 w-5" />
    <span>{item.label}</span>
  </NavLink>
))}

{/* Centre Plus Button */}
<NavLink
  to="/new-session"
  data-tutorial="tutorial-new-session"
  className={({ isActive }) =>
    cn('flex flex-col items-center justify-center -mt-5 transition-all duration-150', isActive ? 'scale-105' : '')
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
    data-tutorial={
      item.to === '/leaderboard' ? 'tutorial-nav-standings' :
      item.to === '/my-stats' ? 'tutorial-nav-stats' :
      undefined
    }
    className={({ isActive }) =>
      cn(
        'flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-all duration-150 min-h-[44px]',
        isActive ? 'text-gold' : 'text-muted-foreground hover:text-foreground'
      )
    }
  >
    <item.icon className="h-5 w-5" />
    <span>{item.label}</span>
  </NavLink>
))}
```

Also add `data-tutorial` to the desktop nav items (inside `navItems.map`):

```tsx
{navItems.map((item) => (
  <NavLink
    key={item.to}
    to={item.to}
    data-tutorial={
      item.to === '/sessions' ? 'tutorial-nav-sessions' :
      item.to === '/players' ? 'tutorial-nav-players' :
      item.to === '/leaderboard' ? 'tutorial-nav-standings' :
      item.to === '/my-stats' ? 'tutorial-nav-stats' :
      undefined
    }
    className={({ isActive }) =>
      cn(
        'flex items-center gap-2.5 py-2 px-3 text-sm font-medium transition-all duration-150 rounded-md',
        isActive ? 'text-gold bg-muted/50' : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
      )
    }
  >
    <item.icon className="h-4 w-4" />
    <span>{item.label}</span>
  </NavLink>
))}

{/* New Session desktop button */}
<NavLink
  to="/new-session"
  data-tutorial="tutorial-new-session"
  className={({ isActive }) =>
    cn(
      'flex items-center gap-2.5 py-2 px-3 text-sm font-medium transition-all duration-150 rounded-md mt-2 bg-gold/10 border border-gold/20',
      isActive ? 'text-gold bg-gold/20' : 'text-gold hover:bg-gold/20'
    )
  }
>
  <Plus className="h-4 w-4" />
  <span>New Session</span>
</NavLink>
```

- [ ] **Step 2: Add data-tutorial attrs to Header**

In `src/components/layout/Header.tsx`, add `data-tutorial="tutorial-homegame-icon"` to the owner icon button and `data-tutorial="tutorial-settings"` to the settings gear button.

For the icon button (already wrapped for owners):
```tsx
<button
  onClick={() => setIconPickerOpen(true)}
  data-tutorial="tutorial-homegame-icon"
  className="rounded-lg focus:outline-none hover:ring-2 hover:ring-yellow-500/50 transition-all"
  aria-label="Change homegame icon"
>
  <img src={getIconSrc(homegame?.icon_id)} alt={homegame?.name || 'Stack Tracker'} className="w-9 h-9 rounded-lg object-cover" />
</button>
```

For the non-owner img, also add the attr (the overlay step will just not be clickable, which is fine — it still highlights):
```tsx
<img
  src={getIconSrc(homegame?.icon_id)}
  alt={homegame?.name || 'Stack Tracker'}
  data-tutorial="tutorial-homegame-icon"
  className="w-9 h-9 rounded-lg object-cover"
/>
```

For the settings gear `DropdownMenuTrigger` button, add the attr to the inner `Button`:
```tsx
<DropdownMenuTrigger asChild>
  <Button variant="ghost" size="icon" className="h-8 w-8" data-tutorial="tutorial-settings">
    <Settings className="h-4 w-4" />
  </Button>
</DropdownMenuTrigger>
```

- [ ] **Step 3: Add data-tutorial attr to DashboardPage**

In `src/pages/DashboardPage.tsx`, add `data-tutorial="tutorial-dashboard"` to the outermost div:

```tsx
<div data-tutorial="tutorial-dashboard" className="space-y-6 max-w-3xl mx-auto">
```

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/Navigation.tsx src/components/layout/Header.tsx src/pages/DashboardPage.tsx
git commit -m "feat: add data-tutorial attributes to target elements"
```

---

### Task 5: Wire up TutorialProvider in App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Import and wrap with TutorialProvider**

Add the import at the top of `src/App.tsx`:
```tsx
import { TutorialProvider } from '@/contexts/TutorialContext';
```

Wrap `AppRoutes` and `PasswordResetDialog` with `TutorialProvider` inside `AuthProvider`:

```tsx
const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <BrowserRouter>
        <AuthProvider>
          <TutorialProvider>
            <PasswordResetDialog />
            <AppRoutes />
          </TutorialProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);
```

- [ ] **Step 2: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wrap app with TutorialProvider"
```

---

### Task 6: Trigger owner tour from HomegameDialog

**Files:**
- Modify: `src/components/layout/HomegameDialog.tsx`

- [ ] **Step 1: Import useTutorialContext and call startTour on success**

Add import at top of `src/components/layout/HomegameDialog.tsx`:
```tsx
import { useTutorialContext } from '@/contexts/TutorialContext';
```

Inside `HomegameDialog`, add:
```tsx
const { startTour } = useTutorialContext();
```

Update `handleCreateHomegame` to trigger the tour after success:
```tsx
const handleCreateHomegame = async () => {
  if (!newHomegameName.trim()) {
    toast({ title: 'Error', description: 'Please enter a homegame name', variant: 'destructive' });
    return;
  }

  setLoading(true);
  const { error } = await createHomegame(newHomegameName);
  setLoading(false);

  if (error) {
    toast({ title: 'Error', description: error.message || 'Failed to create homegame', variant: 'destructive' });
  } else {
    toast({ title: 'Homegame created' });
    setNewHomegameName('');
    onOpenChange(false);
    startTour('owner');
  }
};
```

- [ ] **Step 2: Commit**

```bash
git add src/components/layout/HomegameDialog.tsx
git commit -m "feat: trigger owner tutorial tour after homegame creation"
```

---

### Task 7: Render overlay + trigger player tour in MainLayout

**Files:**
- Modify: `src/components/layout/MainLayout.tsx`

- [ ] **Step 1: Import dependencies**

Add imports at top of `src/components/layout/MainLayout.tsx`:
```tsx
import { useEffect } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { useTutorialContext } from '@/contexts/TutorialContext';
import { TutorialOverlay } from '@/components/tutorial/TutorialOverlay';
```

- [ ] **Step 2: Add tutorial logic and render overlay**

Update `MainLayout` to add the player tour trigger and render the overlay:

```tsx
export function MainLayout({ children }: MainLayoutProps) {
  const { homegame, currentHomegame, loading } = useAuthContext();
  const { activeTour, currentStep, steps, startTour, nextStep, skipTour } = useTutorialContext();

  // Trigger player tour for non-owner members on first load
  useEffect(() => {
    if (loading || !homegame || !currentHomegame) return;
    if (currentHomegame.role !== 'owner') {
      startTour('player');
    }
  }, [loading, homegame, currentHomegame]);

  return (
    <div className="flex flex-col h-[100dvh] md:block md:relative bg-background">
      {/* Ambient gold glows */}
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

      {/* Tutorial overlay — rendered outside main so it covers the full viewport */}
      {activeTour && (
        <TutorialOverlay
          steps={steps}
          currentStep={currentStep}
          onNext={nextStep}
          onSkip={skipTour}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit and push**

```bash
git add src/components/layout/MainLayout.tsx
git commit -m "feat: render tutorial overlay and trigger player tour in MainLayout"
git push
```

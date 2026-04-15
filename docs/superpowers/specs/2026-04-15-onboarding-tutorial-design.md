# Onboarding Tutorial — Design Spec

**Date:** 2026-04-15

## Overview

Two first-time tooltip spotlight tours that walk new users through the app. One for homegame owners (fires after homegame creation), one for members/players (fires on first login). Each tour highlights real UI elements with a darkened overlay and a tooltip card. Fully skippable. Never shown twice.

---

## Tours

### Owner Tour (7 steps)

Triggers once, immediately after `createHomegame` succeeds.

| # | Target element | Title | Description |
|---|---------------|-------|-------------|
| 1 | Header homegame icon (top-left) | Homegame Icon | "Tap your homegame icon to change it anytime." |
| 2 | Gear/settings button (top-right) | Settings | "All your homegame settings are here — invite codes, manage members, badge toggles." |
| 3 | Centre + button (bottom nav) | New Session | "Tap the gold + to log a new poker session." |
| 4 | Players nav item | Players | "Add your crew here before logging sessions." |
| 5 | Sessions nav item | Sessions | "View and manage all your recorded sessions here." |
| 6 | Standings nav item | Standings | "See the leaderboard and who's up or down across all sessions." |
| 7 | My Stats nav item | My Stats | "Your personal profit chart, badges, and session history." |

### Player Tour (7 steps)

Triggers once on first app load for users whose current homegame role is `member` or `admin` (not `owner`).

| # | Target element | Title | Description |
|---|---------------|-------|-------------|
| 1 | Main content area (dashboard) | Dashboard | "Your home base — see your overall profit, recent sessions, and homegames at a glance." |
| 2 | Centre + button (bottom nav) | New Session | "Tap the gold + to log a new poker session." |
| 3 | Players nav item | Claim Your Player ⚡ | "Find your name in the Players list and tap Claim. This links your account to your player profile — so all your session results show up under My Stats. Without it, your stats won't appear under your account." |
| 4 | Sessions nav item | Sessions | "Browse all recorded sessions and see results." |
| 5 | Standings nav item | Standings | "See where everyone ranks. Who's up, who's down, and this month's badges." |
| 6 | My Stats nav item | My Stats | "Your personal profit chart, win rate, badges, and full session history." |
| 7 | Gear/settings button (top-right) | Settings | "Edit your profile name and manage notification settings here." |

---

## Trigger Logic

- **Owner tour:** Called from `Header.tsx` (or `useAuth.ts`) immediately after `createHomegame` resolves without error. Checks `localStorage.getItem('tutorial_owner_seen')` — if not set, starts the tour.
- **Player tour:** Called from `App.tsx` (inside `ProtectedRoute`) on mount. Checks if user is authenticated, has a homegame, role is not `owner`, and `localStorage.getItem('tutorial_player_seen')` is not set.
- On tour completion or skip: set the corresponding localStorage key to `'1'`.
- Keys: `tutorial_owner_seen`, `tutorial_player_seen`

---

## DOM Targeting

Each highlighted element gets a `data-tutorial="<id>"` attribute. The tour step config references these IDs.

| data-tutorial ID | Element |
|-----------------|---------|
| `tutorial-homegame-icon` | Header homegame icon button |
| `tutorial-settings` | Gear/settings button |
| `tutorial-new-session` | Centre + button in bottom nav |
| `tutorial-nav-players` | Players nav item |
| `tutorial-nav-sessions` | Sessions nav item |
| `tutorial-nav-standings` | Standings nav item |
| `tutorial-nav-stats` | My Stats nav item |
| `tutorial-dashboard` | Main content wrapper on DashboardPage |

---

## Components

### `src/components/tutorial/TutorialOverlay.tsx`

Renders the active tour step:
- Full-screen semi-transparent overlay (`bg-black/60`, `z-[200]`)
- Reads the target element's `getBoundingClientRect()` and cuts out a highlight around it (box-shadow punch-through technique: `box-shadow: 0 0 0 9999px rgba(0,0,0,0.6)` on a positioned div matching the element's rect, with a small border-radius)
- Tooltip card positioned adjacent to the highlighted element (flips side if near screen edge)
- Tooltip contains: step counter ("Step X of Y"), title, description, **Skip** button (left), **Next** / **Got it** (right, gold)
- Listens for window resize to recompute rects
- Does not close on outside click

### `src/hooks/useTutorial.ts`

- Exports `useTutorial()` — returns `{ activeTour, startTour, skipTour, nextStep, currentStep }`
- `activeTour`: `'owner' | 'player' | null`
- `startTour(type)`: sets active tour and step to 0
- `nextStep()`: advances step; if last step, calls `completeTour()`
- `skipTour()` / `completeTour()`: sets localStorage key, clears active tour

### Tour step configs

Defined as static arrays in `src/components/tutorial/tours.ts`:
```ts
export interface TourStep {
  targetId: string;   // data-tutorial attribute value
  title: string;
  description: string;
}
export const OWNER_TOUR: TourStep[] = [ ... ];
export const PLAYER_TOUR: TourStep[] = [ ... ];
```

---

## Files to Create / Modify

| Action | File |
|--------|------|
| Create | `src/components/tutorial/TutorialOverlay.tsx` |
| Create | `src/components/tutorial/tours.ts` |
| Create | `src/hooks/useTutorial.ts` |
| Modify | `src/components/layout/MainLayout.tsx` — mount `<TutorialOverlay>`, trigger player tour |
| Modify | `src/components/layout/Header.tsx` — add `data-tutorial` attrs, trigger owner tour after createHomegame |
| Modify | `src/components/layout/Navigation.tsx` — add `data-tutorial` attrs to nav items and + button |
| Modify | `src/pages/DashboardPage.tsx` — add `data-tutorial="tutorial-dashboard"` to main wrapper |

---

## Constraints

- No new routes or pages.
- No database changes — localStorage only.
- Tutorial layer sits at `z-[200]` (above header at z-50, above everything else).
- Mobile and desktop both supported — tooltip position recalculates on resize.
- If a target element is not found in the DOM for a given step, that step is skipped silently.

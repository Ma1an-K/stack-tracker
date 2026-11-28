# Feature Tour Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A once-only, swipe-through feature tour sheet on Home for new accounts, replayable from the header menu, that never stacks with the install sheet.

**Architecture:** Pure model in `src/lib/onboarding/tour.ts` (eligibility, role, card content). A `TourProvider` in `MainLayout` owns open/closed state and auto-opens on Home; `InstallNudgeProvider` reads it to hold the install sheet and banner while the tour is open. A presentational `FeatureTour` sheet renders the cards.

**Tech Stack:** React 18 + TS, Tailwind/shadcn (`Sheet` from `src/components/ui/sheet`), React Router 6, vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-28-feature-tour-design.md` (visual/copy reference: `docs/tour-prototype.html`).

## Global Constraints

- Work only in the feature worktree (branch `feat/feature-tour`). Never push, never `git stash`, never `supabase db reset`.
- `npm test`, `npm run build` must pass; `npx eslint src` must stay at **16 warnings, 0 errors**.
- `TOUR_RELEASE = '2026-11-28'` (owner resets it to the deploy date). Tip id is the literal `'tour'`; no migration.
- Card copy is verbatim from the `CARDS` object in `docs/tour-prototype.html`.
- Button labels: `Skip`, `Next`, `Let's play` (with a typographic apostrophe: `Let’s play`). Counter format: `1 of 4`. Menu row label: `Take the tour`.
- Phone-first: 375px and 360px, tap targets ≥ 44px, `prefers-reduced-motion` respected.
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. Existing account (created before `TOUR_RELEASE`) signs in → tour never auto-opens. (Task 1 + Task 2 tests.)
2. New member arrives on Home with a queued install sheet (`pendingSheet`) → tour shows first, install sheet only after the tour closes. (Task 2 test.)
3. Profile still loading / `userDataPending` → no auto-open flash, and no auto-open while a live session exists. (Task 2 test.)
4. Swiping the track and tapping Next keep counter, dots and button label in sync; last card's button closes. (Task 3 test.)
5. Replay from the menu works for an old account and for a user with no homegame. (Task 4 test.)

---

### Task 1: Tour model

**Files:**
- Create: `src/lib/onboarding/tour.ts`, `src/lib/onboarding/tour.test.ts`
- Modify: `src/hooks/useTips.ts` (extend `TipId` with `'tour'`)

**Interfaces — Produces:**
- `export const TOUR_RELEASE = '2026-11-28'`
- `export type TourRole = 'host' | 'member' | 'solo'`
- `export function tourRole(homegame: { role: HomegameRole } | null): TourRole` — owner/admin → host, member → member, null → solo.
- `export interface TourCard { id: string; illustration: 'log' | 'oneoff' | 'settle' | 'standings' | 'stats' | 'run' | 'crew'; title: string; body: string; where: string }`
- `export const TOUR_CARDS: Record<TourRole, TourCard[]>` — copy verbatim from the draft.
- `export function isTourEligible(profile: { created_at: string; seen_tips?: string[] } | null): boolean` — true only when profile exists, `seen_tips` is defined, `'tour'` not in it, and `Date.parse(created_at) >= Date.parse(TOUR_RELEASE)`.

- [ ] **Step 1: Write failing tests** in `tour.test.ts`:
  - `tourRole` maps owner→host, admin→host, member→member, null→solo.
  - `TOUR_CARDS.host` has 4 cards titled `['Log every game','Settle up in seconds','Standings and badges','Run your homegame']`; member's 4th is `'Your own stats'` and its body contains `'sidepot calculator'`; solo has 3 ending `'Same crew every week?'`.
  - `isTourEligible`: null → false; `seen_tips` undefined → false; created `'2026-11-27T23:59:59Z'` → false; created `TOUR_RELEASE` → true; `seen_tips: ['tour']` → false.
- [ ] **Step 2:** `npx vitest run src/lib/onboarding/tour.test.ts` → FAIL (module missing).
- [ ] **Step 3:** Implement `tour.ts`; add `'tour'` to `TipId`.
- [ ] **Step 4:** Re-run → PASS. Run `npx vitest run src/hooks` → PASS.
- [ ] **Step 5:** Commit `feat(tour): tour eligibility, roles and card copy`.

### Task 2: Tour state and install-sheet ordering

**Files:**
- Create: `src/contexts/TourContext.tsx`, `src/contexts/TourContext.test.tsx`
- Modify: `src/components/layout/MainLayout.tsx` (wrap `InstallNudgeProvider` inside `TourProvider`), `src/contexts/InstallNudgeContext.tsx`, its test file.

**Interfaces — Consumes:** Task 1 (`isTourEligible`, `tourRole`), `useTips().markSeen('tour')`, `useAuthContext()` (`profile`, `homegame`, `loading`, `userDataPending`), `useLiveSession()`.
**Produces:**
- `export function TourProvider({ children })` and `export function useTour(): { open: boolean; role: TourRole; openTour: () => void; closeTour: () => void; maybeAutoOpen: () => void }`.
  - `role` is computed from the current homegame at the moment of opening (store it in state when opening).
  - `maybeAutoOpen()` opens only if auth is ready (`!loading && !userDataPending`), `isTourEligible(profile)`, no live session, and it hasn't auto-opened already this mount.
  - `closeTour()` sets open false and calls `markSeen('tour')`.
  - Renders `<FeatureTour open role onClose={closeTour} />` (Task 3). Until Task 3 lands, render nothing; Task 3 adds the render.
- `InstallNudgeProvider`: when `useTour().open` is true, `firstSuccess` and the arrival `pendingSheet` do not open the sheet but set a held flag; when the tour closes, open the sheet if held and `sheetAllowedNow()`. `bannerVisible` is false while the tour is open.

- [ ] **Step 1: Write failing tests:**
  - TourContext: eligible profile + `maybeAutoOpen()` → `open` true; ineligible (created before release) → stays false; `userDataPending` true → false; live session → false; calling `maybeAutoOpen` twice after closing → stays closed; `closeTour` calls `markSeen('tour')`; `openTour()` opens regardless of eligibility.
  - InstallNudge: with tour open, `firstSuccess('claim', true)` does not show the install sheet; after the tour closes, it shows. Arrival `pendingSheet` with tour open → sheet shows only after close. Banner hidden while tour open.
- [ ] **Step 2:** Run the two test files → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Re-run → PASS; full `npm test` → PASS.
- [ ] **Step 5:** Commit `feat(tour): tour state, auto-open rules and install sheet ordering`.

### Task 3: FeatureTour sheet

**Files:**
- Create: `src/components/tour/FeatureTour.tsx`, `src/components/tour/TourIllustration.tsx`, `src/components/tour/FeatureTour.test.tsx`
- Modify: `src/contexts/TourContext.tsx` (render `FeatureTour`)

**Interfaces — Consumes:** `TOUR_CARDS`, `TourRole` (Task 1). **Produces:** `export function FeatureTour({ open, role, onClose }: { open: boolean; role: TourRole; onClose: () => void })`.

Behaviour per spec "Presentation": shadcn `Sheet` `side="bottom"` styled like `InstallSheet`; `SheetTitle` (visually hidden "Feature tour" is fine) for dialog labelling; counter `N of M`; Skip (calls `onClose`); scroll-snap track (`overflow-x-auto snap-x snap-mandatory`, each card `w-full shrink-0 snap-center`); dots; primary button `Next` / `Let’s play`. Track scroll updates the index (`Math.round(scrollLeft / clientWidth)`); Next scrolls to the next card (`behavior: 'auto'` when reduced motion). Illustrations reproduce the draft's drawn mini-UIs using app tokens/Tailwind only.

- [ ] **Step 1: Write failing tests:** renders host card 1 title and `1 of 4`; clicking Next shows `2 of 4` (mock `scrollTo` to set `scrollLeft` and dispatch `scroll`); on the last card the button reads `Let’s play` and clicking it calls `onClose`; Skip calls `onClose`; solo shows `1 of 3`; firing a `scroll` event with `scrollLeft = 2 * clientWidth` shows `3 of 4`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement; wire into `TourProvider`.
- [ ] **Step 4:** Run → PASS; full `npm test`, `npm run build`.
- [ ] **Step 5:** Commit `feat(tour): swipe-through feature tour sheet`.

### Task 4: Auto-open on Home and "Take the tour"

**Files:**
- Modify: `src/pages/DashboardPage.tsx` (both `HomegameDashboard` and the `NoHomegameHome` path: call `useTour().maybeAutoOpen()` in an effect on mount), `src/components/layout/Header.tsx` (a `ClubRow` labelled `Take the tour` with a lucide `Compass` icon, visible to every signed-in user including no-homegame, calling `openTour()`), tests for both.

- [ ] **Step 1: Write failing tests:** DashboardPage calls `maybeAutoOpen` on mount (mock `useTour`), for both a homegame and no homegame; Header shows `Take the tour` with and without a homegame and clicking it calls `openTour`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run → PASS; full `npm test`, `npm run build`, `npx eslint src` (16 warnings).
- [ ] **Step 5:** Commit `feat(tour): open the tour on first Home visit and from the menu`.

# Changelog

## 2026-04-15

### Onboarding Tutorial Tours

Two first-time tooltip spotlight tours that walk new users through the app. Each tour highlights real UI elements with a darkened overlay and tooltip card. Fully skippable. Never shown twice (gated by localStorage flags).

**Owner Tour (8 steps)** — fires automatically after creating a homegame:
1. Homegame Icon — tap to change it anytime
2. Settings — invite codes, manage members, badge toggles
3. New Session — tap the gold + to log a session
4. Players — add your crew before logging sessions
5. Sessions — view and manage recorded sessions
6. Standings — leaderboard and profit/loss across sessions
7. My Stats — personal profit chart, badges, session history
8. Add to Home Screen — install prompt (platform-aware, see below)

**Player Tour (8 steps)** — fires on first login for non-owner members:
1. Dashboard — home base overview
2. New Session — tap the gold + to log a session
3. Claim Your Player ⚡ — link account to player profile so stats are tracked
4. Sessions — browse recorded sessions
5. Standings — see everyone's rankings and badges
6. My Stats — personal stats and history
7. Settings — edit profile name and notifications
8. Add to Home Screen — install prompt (platform-aware, see below)

**Add to Home Screen step** — final step of both tours:
- Android/Chrome: shows a gold "Install App" button that fires the native browser install prompt
- iOS/Safari: shows "Tap Share ↑ then Add to Home Screen" instructions
- Already installed or desktop: step is skipped silently

**New files:**
- `src/components/tutorial/tours.ts` — tour step config arrays
- `src/contexts/TutorialContext.tsx` — tour state, localStorage persistence, skip/complete logic
- `src/components/tutorial/TutorialOverlay.tsx` — spotlight overlay + tooltip card component
- `src/hooks/useInstallPrompt.ts` — PWA install detection (Android/iOS/standalone/unsupported)

**Modified files:**
- `src/App.tsx` — wrapped with `TutorialProvider`
- `src/components/layout/Navigation.tsx` — `data-tutorial` attributes on nav items and centre + button
- `src/components/layout/Header.tsx` — `data-tutorial` attributes on homegame icon and settings gear
- `src/pages/DashboardPage.tsx` — `data-tutorial="tutorial-dashboard"` on main wrapper
- `src/components/layout/HomegameDialog.tsx` — triggers owner tour after creating additional homegames
- `src/components/auth/AuthPage.tsx` — triggers owner tour after first homegame creation
- `src/components/layout/MainLayout.tsx` — triggers player tour on mount, renders TutorialOverlay

---

### Homegame Icon Click + Badge Toggles

**Clickable homegame icon (owners only):**
- The homegame icon in the top-left of the header is now a tappable button for owners
- Tapping opens the icon picker modal to change the homegame icon

**Badge toggle in gear menu (owners only):**
- New "Badges" entry in the gear dropdown (owner section only)
- Opens a dialog listing all available badges with toggle switches
- Toggling a badge on/off affects all members of the homegame
- Disabled badges no longer appear in Standings (leaderboard) or My Stats for any member
- Stored as `disabled_badges TEXT[]` on the `homegames` table (Supabase)

**New DB migration:**
- `supabase/migrations/20260415000002_add_disabled_badges.sql` — adds `disabled_badges TEXT[] DEFAULT '{}'` column to `homegames`

**Modified files:**
- `src/components/layout/Header.tsx` — clickable icon button, badge toggle dialog
- `src/types/database.ts` — added `disabled_badges: string[] | null` to `Homegame` interface
- `src/lib/badges.ts` — `computeHomegameBadges` accepts optional `disabledBadges` param
- `src/components/leaderboard/Leaderboard.tsx` — passes `disabled_badges` to badge computation
- `src/hooks/usePersonalStats.ts` — passes `disabled_badges` to badge computation

---

### Icon Picker Improvements

- Icon picker modal is now scrollable and fits within the screen on all device sizes
- Grid uses 4 columns with `overflow-y-auto` and `max-h-[85vh]` cap
- Added 12 new gem-themed homegame icons: emerald, ruby, and diamond variants of all 4 card suits

**Modified files:**
- `src/lib/homegameIcons.ts` — added 12 new gem icon entries
- `public/homegame-icons/` — new WebP icon files

---

### Calculator Horizontal Scroll Fix

- The sidepot calculator no longer requires horizontal scrolling on mobile
- Controls row uses `flex-wrap` so items wrap on narrow screens
- "Texas Hold'em" tab label shortened to "Hold'em" to save space
- `overflow-x-hidden` added to the main layout element

**Modified files:**
- `src/components/calculator/SidepotCalculator.tsx`
- `src/components/layout/MainLayout.tsx`

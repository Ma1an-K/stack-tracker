# First Run and Phone Install Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the forced create/join screen and icon tours with a guided first run that works without a homegame, and push phone users to add Stack Tracker to their home screen.

**Architecture:** Signed-in users with no homegame now get into the app shell (a decision moved into a pure `shellRoute` function). A new `/welcome` area holds the choice screen and the host/join flows, outside the tab shell. The checklist and tips read real data and `profiles.seen_tips`. Install logic sits on one pure `getInstallContext()` and one `GetTheApp` entry component, so store badges can replace the home-screen guide later.

**Tech Stack:** Vite 5 + React 18 + TS 5.8, Tailwind + shadcn/ui, React Router 6, Supabase (RLS, pgTAP via `supabase test db`), vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-28-first-run-and-phone-install-design.md` (mock: `docs/onboarding-prototype.html`; copy on screens comes from the mock)

**Two parts, each shippable on its own:** Part A (Tasks 1–9) is the first run. Part B (Tasks 10–15) is the phone install push. Part B depends only on Task 2 from Part A.

## Global Constraints

- Build gated on `tsc` (`npm run build`). The 16 existing lint warnings stay; add no new ones (`npm run lint`).
- Every task: `npm test` passes. Tasks touching `supabase/` also pass `npm run test:db` against local Supabase (`supabase status` must show it running).
- Migrations go in `supabase/migrations/` only. Never `db push`; the owner applies them to production.
- RLS: only owners/admins add players; claims stay host-approved for members; `oneoff_games` stays owner-only.
- Install UI never shows when `isStandalone()` or `isNativeApp()` (`src/lib/platform.ts`).
- Rollout is for new users only. Checklist only on homegames with `created_at >= ONBOARDING_CUTOFF`; the tips migration marks all tips seen for existing profiles.
- Phone-first: every new screen is designed at 375px wide first. Tap targets are at least 44px.
- Copy is plain and second person, taken from the mock where it exists. No em-dash asides.
- Work on branch `feat/first-run`. Commit per task. Never push.

## Review Focus

1. **Invite link, then "Continue in browser"**: the invite code must survive sign-up, email confirmation and sign-in, and arrive pre-filled on `/welcome/join`. Test in Task 4.
2. **No-homegame user deep-links to `/sessions`, `/leaderboard` or `/players`**: they should see the start-or-join card, with no redirect loop and no crash on `homegame` being null. Test in Task 3.
3. **Host quits after step 1** (homegame exists, no players): the next open should land on Home with the checklist, not get stuck in or sent back to `/welcome`. Test in Task 4.
4. **Crew names that are blank, duplicated, or only differ by case**: Continue stays disabled with a readable reason. Test in Task 5.
5. **iPadOS Safari reports a Mac user agent**: it must be treated as iOS Safari, not desktop. Test in Task 10.

---

## Part A: First run

### Task 1: `profiles.seen_tips` with existing users backfilled

**Files:**
- Create: `supabase/migrations/20261128000000_profiles_seen_tips.sql`
- Create: `supabase/tests/100_seen_tips.test.sql`
- Modify: `src/integrations/supabase/types.ts` (regenerate: `supabase gen types typescript --local`), `src/types/database.ts` (`Profile.seen_tips: string[]`)

**Interfaces:**
- Produces: column `public.profiles.seen_tips text[] NOT NULL DEFAULT '{}'`. Tip ids are `'home-plus'` and `'mystats-member'`.

- [ ] **Step 1: Write the pgTAP test** `100_seen_tips.test.sql`: `has_column('public','profiles','seen_tips')`; a profile inserted after the migration has `seen_tips = '{}'`; an authenticated user can `UPDATE profiles SET seen_tips = array_append(seen_tips,'home-plus') WHERE id = auth.uid()` and cannot update another user's row (0 rows affected). Follow the auth-impersonation pattern in `090_approve_claim.test.sql`.
- [ ] **Step 2: Run** `npm run test:db`. Expected: FAIL (column missing).
- [ ] **Step 3: Write the migration.** Add the column, then `UPDATE public.profiles SET seen_tips = ARRAY['home-plus','mystats-member'];` so existing accounts never see the tips.
- [ ] **Step 4: Run** `supabase db reset && npm run test:db`. Expected: all pass. Regenerate types, run `npm run build`.
- [ ] **Step 5: Commit** `feat(db): add profiles.seen_tips, existing users marked seen`

### Task 2: Let signed-in users with no homegame into the shell

**Files:**
- Create: `src/lib/shellRoute.ts`, `src/lib/shellRoute.test.ts`
- Modify: `src/App.tsx` (`AppShell`), `src/components/layout/Header.tsx`, `src/components/layout/Navigation.tsx`, `src/components/layout/MainLayout.tsx`
- Test: `src/components/layout/Navigation.test.tsx` (extend)

**Interfaces:**
- Produces: `shellRoute(input: { loading: boolean; user: boolean; homegame: boolean; pathname: string; native: boolean }): 'splash' | 'landing' | 'auth' | 'shell'`. Everything after this task must handle `homegame === null` inside the shell.

- [ ] **Step 1: Write failing tests** in `shellRoute.test.ts`:
  - `loading` → `'splash'`
  - signed out on `/` (web) → `'landing'`; on `/` (native) → `'auth'`; on `/sessions` → `'auth'`
  - signed in with no homegame on `/` → `'shell'`; on `/sessions` → `'shell'`
  - signed in with a homegame → `'shell'`

  In `Navigation.test.tsx`, add: with no homegame (mock `useAuthContext` → `homegame: null`), the centre button links to `/one-off`.
- [ ] **Step 2: Run** `npx vitest run src/lib/shellRoute.test.ts src/components/layout/Navigation.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement `shellRoute`** and use it in `AppShell`. Update `usePrefetchRoutes` to `!loading && !!user`.
  - Header with no homegame: the app icon, "Stack Tracker", and role line "NO HOMEGAME YET", with no switcher. The club menu stays.
  - Navigation: centre `+` goes to `/one-off` when there's no homegame and no in-progress one-off.
- [ ] **Step 4: Run** the tests, then `npm test && npm run build`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(shell): let signed-in users without a homegame into the app`

### Task 3: Home without a homegame, and start-or-join on homegame tabs

**Files:**
- Create: `src/components/home/NoHomegameHome.tsx`, `src/components/home/StartOrJoinCard.tsx`, `src/hooks/useSavedOneOffGames.ts`, `src/components/home/NoHomegameHome.test.tsx`
- Modify: `src/pages/DashboardPage.tsx`, `src/pages/SessionsPage.tsx`, `src/pages/LeaderboardPage.tsx`, `src/pages/PlayersPage.tsx`, `src/pages/oneoff/OneOffHubPage.tsx` (use the new hook)

**Interfaces:**
- Consumes: Task 2 (null homegame in shell).
- Produces: `<StartOrJoinCard />`, whose buttons link to `/welcome/host` and `/welcome/join`; `useSavedOneOffGames(): { games: SavedOneOffSummary[]; loading: boolean }`. This is the query `OneOffHubPage` already runs, moved out and unchanged.

- [ ] **Step 1: Write failing tests** in `NoHomegameHome.test.tsx`:
  - It renders "Start live game", "Enter final totals" and "Play with the same crew?".
  - Clicking "Enter final totals" opens `StartGameDialog` in `totals` mode.
  - With no saved games, it shows "No saved games yet".
  - Rendering `SessionsPage`, `LeaderboardPage` and `PlayersPage` with `homegame: null` shows `StartOrJoinCard` and doesn't throw (Review Focus 2).
- [ ] **Step 2: Run** `npx vitest run src/components/home`. Expected: FAIL.
- [ ] **Step 3: Implement the components.**
  - `DashboardPage` returns `<NoHomegameHome />` when `!homegame`.
  - The three tab pages return `<StartOrJoinCard />` early when `!homegame`.
  - Layout and copy come from the mock screen "Home without a homegame".
- [ ] **Step 4: Run** `npm test && npm run build`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(home): home and tab empty states for users without a homegame`

### Task 4: `/welcome` choice screen, replacing the AuthPage setup step

**Files:**
- Create: `src/pages/welcome/WelcomeLayout.tsx` (full-screen, no tab bar; signed-out users are sent to `/auth`), `src/pages/welcome/WelcomeChoicePage.tsx`, `src/lib/onboarding/welcomeTarget.ts`, `src/lib/onboarding/welcomeTarget.test.ts`
- Modify: `src/App.tsx` (routes `/welcome`, `/welcome/host`, `/welcome/join`, `/welcome/who`), `src/components/auth/AuthPage.tsx` (delete the `step === 'setup'` UI and its create/join handlers)

**Interfaces:**
- Produces: `welcomeTarget(input: { homegameCount: number; pendingCode: string | null; hasSeenWelcome: boolean }): '/' | '/welcome' | '/welcome/join'`.
  - `hasSeenWelcome` is `localStorage['welcome_seen'] === '1'`, set when any choice is tapped.
  - Pages owned by Tasks 5 and 7 mount at the routes above.

- [ ] **Step 1: Write failing tests** in `welcomeTarget.test.ts`:
  - `{0, null, false}` → `'/welcome'`
  - `{0, 'K7Q4MX', false}` → `'/welcome/join'`
  - `{0, 'K7Q4MX', true}` → `'/welcome/join'` (the invite wins)
  - `{1, null, false}` → `'/'` (Review Focus 3: host quit after step 1)
  - `{0, null, true}` → `'/'` (chose quick game earlier)

  Add an AuthPage test: with `?code=K7Q-4MX`, `savePendingCode` is called before sign-in, and after sign-in with 0 homegames it navigates to `/welcome/join` (Review Focus 1).
- [ ] **Step 2: Run** `npx vitest run src/lib/onboarding src/components/auth`. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - AuthPage's post-sign-in effect navigates to `welcomeTarget(...)`.
  - `WelcomeChoicePage` uses the mock's three cards. "Just settle tonight" sets `welcome_seen`, navigates to `/one-off`, and opens `StartGameDialog` (pass `?start=live`; `OneOffHubPage` reads it into `startMode`).
- [ ] **Step 4: Run** `npm test && npm run build`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(onboarding): "What brings you here?" replaces the forced create/join screen`

### Task 5: Host setup (name, crew, invite, first game)

**Files:**
- Create: `src/pages/welcome/HostSetupPage.tsx`, `src/lib/onboarding/ensureInviteCode.ts`, `src/lib/onboarding/ensureInviteCode.test.ts`, `src/pages/welcome/HostSetupPage.test.tsx`, `supabase/tests/110_owner_self_player.test.sql`
- Modify: `src/hooks/usePlayers.ts`

**Interfaces:**
- Consumes: `createHomegame(name)` from `useAuthContext`; `validateNames(names): string | null` from `src/lib/oneOff/localStore.ts` (reuse it for the crew check); `createInviteCode()` / `activeInviteCodes` from `useInviteCodes`.
- Produces:
  - `addPlayer(name: string, opts?: { linkUserId?: string })`: inserts with `user_id` set when given.
  - `pickInviteCode(active: InviteCode[]): InviteCode | null`: the newest active, unexpired code.
  - `localStorage['invite_shared:<homegameId>'] = '1'` on Copy/Share. Task 8 reads this.

- [ ] **Step 1: Write failing tests.**
  - pgTAP `110`: a homegame owner can insert a player with `user_id = auth.uid()`; a member cannot insert a player.
  - `ensureInviteCode.test.ts`: `pickInviteCode` returns the newest active unexpired code, skips expired codes (use `inviteExpiry.ts`), and returns `null` when there are none.
  - `HostSetupPage.test.tsx`:
    - Continue on the crew step is disabled for `['Sam','']`, `['Sam','sam']` and `['Sam']`, and shows `validateNames`' message or "Add at least 2 players" (Review Focus 4).
    - Enabled for `['Sam','Dan']`.
    - "Enter final totals" navigates to `/new-session?seat=all`; "Play live" goes to `/live-session`; "I'll do this later" goes to `/`.
- [ ] **Step 2: Run** `npm run test:db && npx vitest run src/lib/onboarding src/pages/welcome`. Expected: FAIL.
- [ ] **Step 3: Implement `HostSetupPage`** as one component with `step: 1|2|3|4` and a progress bar.
  - Step 1 calls `createHomegame` on Continue. Show the 5-homegame-limit error inline.
  - Step 2 adds "You" with `linkUserId: user.id` (pre-filled with `profile.display_name`, removable), plus the other names.
  - Step 3 shows `pickInviteCode(...)`, or calls `createInviteCode()` with the existing defaults if it returns `null`. Share uses `navigator.share` when available, otherwise copy. Link format: `${publicOrigin()}/auth?mode=signup&code=…`, as in `InviteCodesPage`.
  - Step 4 has the two modes.
  - Copy comes from the mock.
- [ ] **Step 4: Run** all suites plus build. Expected: PASS.
- [ ] **Step 5: Commit** `feat(onboarding): guided host setup with crew, invite and first game`

### Task 6: Seat the whole crew from setup (`?seat=all`)

**Files:**
- Modify: `src/pages/NewSessionPage.tsx`
- Test: `src/pages/NewSessionPage.test.tsx` (create)

**Interfaces:**
- Consumes: `SessionForm`'s existing `initialPlayers?: { player_id: string; buy_in: number; cash_out?: number }[]`.

- [ ] **Step 1: Write a failing test.** With `?seat=all` and 3 active players, `SessionForm` receives `initialPlayers` with all 3 ids and `buy_in: 0`. Without the param it receives none. `?from=live` still wins when a live session exists.
- [ ] **Step 2: Run** it. Expected: FAIL.
- [ ] **Step 3: Implement** in `NewSessionPage`.
- [ ] **Step 4: Run** `npm test`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(sessions): seat all active players when arriving from setup`

### Task 7: Join flow, including "Which one is you?"

**Files:**
- Create: `src/pages/welcome/JoinPage.tsx`, `src/pages/welcome/WhoAreYouPage.tsx`, `src/pages/welcome/WhoAreYouPage.test.tsx`
- Modify: `src/components/layout/HomegameDialog.tsx` (Join tab: on success, navigate to `/welcome/who`)

**Interfaces:**
- Consumes: `joinHomegame(code)`; `parseInviteCode`, `readPendingCode`, `clearPendingCode` (`src/lib/inviteLink.ts`); `usePlayers(homegameId).players`; `usePlayerClaims(homegameId).requestClaim(playerId)`.

- [ ] **Step 1: Write failing tests** in `WhoAreYouPage.test.tsx`:
  - It lists only players with `user_id === null`.
  - Selecting one and tapping "That's me" calls `requestClaim(id)`, then navigates to `/`.
  - "Skip, I'm just watching" navigates to `/` without a claim.
  - "I'm not on the list" navigates to `/` and shows a toast: "Ask your host to add you, then claim your name from Players."
- [ ] **Step 2: Run** them. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - `JoinPage` pre-fills the code (from the param or the pending code), joins, clears the pending code, and goes to `/welcome/who`.
  - `WhoAreYouPage` shows names only (no game counts; plan call to avoid a new query).
- [ ] **Step 4: Run** `npm test && npm run build`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(onboarding): join flow asks "Which one is you?" right after joining`

### Task 8: Getting-started checklist

**Files:**
- Create: `src/lib/onboarding/checklist.ts`, `src/lib/onboarding/checklist.test.ts`, `src/hooks/useGettingStarted.ts`, `src/components/home/GettingStartedCard.tsx`
- Modify: `src/pages/DashboardPage.tsx`

**Interfaces:**
- Produces:
  - `ONBOARDING_CUTOFF: string`: an ISO date set to the release date when this ships. Until then use `'2026-12-01'`.
  - `getChecklist(input: { createdAt: string; isOwner: boolean; playerCount: number; memberCount: number; sessionCount: number; inviteShared: boolean }): { visible: boolean; items: { id: 'create'|'players'|'invite'|'game'; done: boolean }[]; doneCount: number }`.
  - `useGettingStarted(homegameId)` makes head-count queries on `players` (active), `homegame_members` and `sessions`, and reads `invite_shared:<id>`.

- [ ] **Step 1: Write failing tests** for `getChecklist`:
  - Visible only when `isOwner`, `createdAt >= ONBOARDING_CUTOFF`, and not all 4 are done.
  - `players` done when `playerCount >= 2`.
  - `invite` done when `memberCount >= 2 || inviteShared`.
  - `game` done when `sessionCount >= 1`.
  - `create` is always done.
  - A pre-cutoff homegame is never visible.
- [ ] **Step 2: Run** `npx vitest run src/lib/onboarding/checklist.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the hook and card (mock "Home with checklist"). Undone items link to:
  - Players: `/players`
  - Invite: copy/share, which also sets the flag
  - Game: `/new-session?seat=all`
- [ ] **Step 4: Run** `npm test && npm run build`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(home): getting-started checklist for new homegames`

### Task 9: Account-stored tips; remove the tours

**Files:**
- Create: `src/hooks/useTips.ts`, `src/hooks/useTips.test.ts`, `src/components/tips/Tip.tsx`
- Modify: `src/pages/DashboardPage.tsx`, `src/pages/MyStatsPage.tsx`, `src/App.tsx`, `src/components/layout/MainLayout.tsx`, `src/components/layout/HomegameDialog.tsx`, `src/components/auth/AuthPage.tsx`
- Delete: `src/contexts/TutorialContext.tsx`, `src/components/tutorial/` (all of it)

**Interfaces:**
- Consumes: `profile.seen_tips` (Task 1), `updateProfile` from `useAuthContext`.
- Produces: `useTips(): { shouldShow(id: TipId): boolean; markSeen(id: TipId): Promise<void> }` with `type TipId = 'home-plus' | 'mystats-member'`.

- [ ] **Step 1: Write failing tests** in `useTips.test.ts`:
  - `shouldShow('home-plus')` is false when `seen_tips` includes it.
  - `markSeen` calls `updateProfile({ seen_tips: [...seen, id] })` once and hides the tip right away (optimistic).
  - It's false while `profile` is null.
- [ ] **Step 2: Run** them. Expected: FAIL.
- [ ] **Step 3: Implement** and remove the old tour.
  - Show "home-plus" on Dashboard for owners when `sessionCount >= 1` ("Tap + to log another game. Your crew stays seated.").
  - Show "mystats-member" on MyStats for members ("Your results show here once your host confirms your name.").
  - Remove every `startTour`, `TutorialProvider`, `TutorialOverlay` and `data-tutorial` use.
  - On app start, remove the `tutorial_owner_seen` and `tutorial_player_seen` keys from localStorage.
  - Keep `useInstallPrompt` (Part B refactors it).
- [ ] **Step 4: Run** `npm test && npm run build && npm run lint`. Expected: PASS, still 16 warnings.
- [ ] **Step 5: Commit** `feat(tips): account-stored tips replace the icon tours`

---

## Part B: Phone install

### Task 10: `getInstallContext()`

**Files:**
- Create: `src/lib/installContext.ts`, `src/lib/installContext.test.ts`
- Modify: `src/hooks/useInstallPrompt.ts` (derive `platform` from `getInstallContext`), `src/lib/platform.ts` (add `isStandalone(): boolean`)

**Interfaces:**
- Produces:
  - `type InstallContext = 'native' | 'installed' | 'in-app' | 'ios-safari' | 'ios-other' | 'android-prompt' | 'android-manual' | 'desktop'`
  - `getInstallContext(env: { ua: string; maxTouchPoints: number; standalone: boolean; native: boolean; hasPrompt: boolean }): InstallContext`
  - `isPhoneContext(c: InstallContext): boolean` (true for `in-app`, `ios-*`, `android-*`)

- [ ] **Step 1: Write failing tests**, checked in this order:
  - `native` → `'native'`; `standalone` → `'installed'`
  - UAs containing `FBAN`, `FBAV`, `Instagram`, `WhatsApp`, `Line/`, `MicroMessenger`, `Snapchat`, `TikTok` or `LinkedInApp` → `'in-app'`
  - iPhone Safari UA → `'ios-safari'`
  - `CriOS`, `FxiOS` or `EdgiOS` → `'ios-other'`
  - `Macintosh` UA with `maxTouchPoints: 5` → `'ios-safari'` (Review Focus 5)
  - Android Chrome with `hasPrompt` → `'android-prompt'`, without → `'android-manual'`
  - Mac/Windows desktop → `'desktop'`
- [ ] **Step 2: Run** them. Expected: FAIL.
- [ ] **Step 3: Implement** `getInstallContext` and refactor the hook. The existing tour consumers are gone after Task 9, so update the hook's return type to `{ context: InstallContext; trigger: (() => void) | null }`.
- [ ] **Step 4: Run** `npm test && npm run build`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(install): one detector for install context`

### Task 11: Install guide and the `GetTheApp` entry point

**Files:**
- Create: `src/components/install/InstallGuide.tsx`, `src/components/install/GetTheApp.tsx`, `src/components/install/GetTheApp.test.tsx`
- Modify: `.env.example` (add `VITE_APP_STORE_URL=` and `VITE_PLAY_STORE_URL=`)

**Interfaces:**
- Consumes: `useInstallPrompt()` (Task 10).
- Produces:
  - `<GetTheApp variant="landing" | "sheet" | "banner" | "hero" inviteCode?: string onContinue?: () => void />`
  - `<InstallGuide context={InstallContext} inviteCode?: string />`

- [ ] **Step 1: Write failing tests** in `GetTheApp.test.tsx`:
  - With both store env vars set (stub `import.meta.env`), it renders "App Store" and "Google Play" links and a secondary "or add it from your browser".
  - Without them, in the `ios-safari` context, tapping "Add to Home Screen" shows the three steps.
  - In `android-prompt`, it calls `trigger`.
  - In `in-app`, it shows "Open this in Safari first" and a Copy button.
  - In `installed` or `native`, it renders nothing.
  - `inviteCode` shows in the iOS guide.
- [ ] **Step 2: Run** them. Expected: FAIL.
- [ ] **Step 3: Implement.** Copy, Safari icons and the Share pointer come from the mock screens "iPhone: how to add it", "Opened from WhatsApp or Instagram" and "Later: store badges". `android-manual` shows: ⋮ menu → "Install app".
- [ ] **Step 4: Run** `npm test && npm run build`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(install): install guide and single get-the-app entry point`

### Task 12: Phone landing, and install-first for invite links

**Files:**
- Create: `src/pages/PhoneLandingPage.tsx`, `src/lib/installFirst.ts`, `src/lib/installFirst.test.ts`
- Modify: `src/App.tsx` (`AppShell` landing branch and `AuthRoute`), `src/pages/LandingPage.tsx` (reachable as "Learn more" via `/?learn=1`)

**Interfaces:**
- Produces: `showInstallFirst(input: { context: InstallContext; signedIn: boolean; continued: boolean; learn: boolean }): boolean`. `continued` is `sessionStorage['continue_in_browser'] === '1'`.

- [ ] **Step 1: Write failing tests** for `showInstallFirst`: true only when `isPhoneContext(context)`, not signed in, not `continued`, and not `learn`. Add an App-level test: `/auth?mode=signup&code=K7Q-4MX` in the `ios-safari` context renders `PhoneLandingPage` with "K7Q-4MX" shown, and "Continue in browser" leads to the signup form with the code saved as pending.
- [ ] **Step 2: Run** them. Expected: FAIL.
- [ ] **Step 3: Implement.** `PhoneLandingPage` follows the mock's phone landing screen: `<GetTheApp variant="landing" inviteCode onContinue />`, plus a "Learn more" link to `/?learn=1`. In `AppShell`'s landing branch and `AuthRoute`, use `PhoneLandingPage` when `showInstallFirst` is true.
- [ ] **Step 4: Run** `npm test && npm run build`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(install): phone landing page asks to install before sign-up`

### Task 13: Confirmation landing in a phone browser

**Files:**
- Create: `src/pages/ConfirmedPage.tsx`, `src/pages/ConfirmedPage.test.tsx`
- Modify: `src/hooks/useAuth.ts` (`signUp` `emailRedirectTo` → `${publicOrigin()}/confirmed`), `src/App.tsx` (public route `/confirmed`)

- [ ] **Step 1: Write failing tests.**
  - In a phone context (not installed), it shows "You're confirmed" and "Open Stack Tracker from your Home Screen to sign in", plus a "Continue here instead" button that sets `continue_in_browser` and navigates to `/`.
  - In `desktop` or `installed`, it redirects to `/` straight away.
- [ ] **Step 2: Run** them. Expected: FAIL.
- [ ] **Step 3: Implement.** Add `/confirmed` to the Supabase redirect allow-list in `supabase/config.toml` (`additional_redirect_urls`). Note in the commit body that the production allow-list needs the same URL added by hand.
- [ ] **Step 4: Run** `npm test && npm run build`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(auth): confirmation page points phone users back to the installed app`

### Task 14: Laptop hero QR

**Files:**
- Modify: `package.json` (add `qrcode@1.5.4` and `@types/qrcode`), `src/pages/LandingPage.tsx` (hero)
- Create: `src/components/install/PhoneQr.tsx`, `src/components/install/PhoneQr.test.tsx`

**Interfaces:**
- Produces: `<PhoneQr url={string} />`, which renders an inline SVG via `QRCode.toString(url, { type: 'svg', margin: 1 })`.

- [ ] **Step 1: Write a failing test.** It renders an `<svg>` and the caption "Scan with your phone camera".
- [ ] **Step 2: Run** it. Expected: FAIL.
- [ ] **Step 3: Implement.** Show it in the hero only at `lg` and up and when `getInstallContext` is `'desktop'`, beside an "Or use it here" button to `/auth?mode=signup`. The QR URL is `${publicOrigin()}/`.
- [ ] **Step 4: Run** `npm test && npm run build`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(landing): QR code to open Stack Tracker on a phone`

### Task 15: Second ask and Home banner

**Files:**
- Create: `src/lib/installNudge.ts`, `src/lib/installNudge.test.ts`, `src/components/install/InstallSheet.tsx`, `src/components/install/InstallBanner.tsx`, `src/contexts/InstallNudgeContext.tsx`
- Modify: `src/components/layout/MainLayout.tsx` (provider and sheet), `src/pages/DashboardPage.tsx` (banner), `src/pages/NewSessionPage.tsx`, `src/pages/welcome/WhoAreYouPage.tsx`, `src/pages/oneoff/OneOffSettlePage.tsx` (call `firstSuccess`)

**Interfaces:**
- Produces:
  - `nudgeState(store: { snoozedUntil?: number; bannerDismissals?: number }, now: number): { sheetAllowed: boolean; bannerVisible: boolean }`
  - `SNOOZE_MS = 7 * 24 * 60 * 60 * 1000`
  - The banner stops at 2 dismissals.
  - Stored in `localStorage['install_nudge']` (JSON).
  - `useInstallNudge().firstSuccess(kind: 'session' | 'claim' | 'oneoff', isAccountFirst: boolean): void`

- [ ] **Step 1: Write failing tests** for `nudgeState`:
  - With no store, the sheet is allowed and the banner is visible.
  - `snoozedUntil` in the future → sheet not allowed.
  - `bannerDismissals: 2` → banner hidden.

  Add an `InstallSheet` test:
  - `firstSuccess('session', true)` in the `ios-safari` context shows "Keep it one tap away".
  - With `isAccountFirst: false`, it shows nothing.
  - In `installed`, it shows nothing.
  - "Not now" sets `snoozedUntil = now + SNOOZE_MS`.
- [ ] **Step 2: Run** them. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - Each caller works out `isAccountFirst` from data it already has:
    - `NewSessionPage`: it's the homegame's first session and the user has no other sessions in `homegameStats`.
    - `WhoAreYouPage`: the user has no earlier claim in `myRequests`.
    - One-off: it's the first saved game in `useSavedOneOffGames`.
  - The sheet's "Show me how" opens `InstallGuide`.
  - The banner uses `<GetTheApp variant="banner" />` and increments `bannerDismissals` on ×.
- [ ] **Step 4: Run** `npm test && npm run build && npm run lint`. Expected: PASS, 16 warnings.
- [ ] **Step 5: Commit** `feat(install): second ask after a first win, then a dismissible banner`

---

## Finish

- [ ] Run `npm test && npm run test:db && npm run build && npm run lint`, all green.
- [ ] Manual pass on `stack-tracker-admin-local` at 375px with a fresh local account through each path: host, join via link, quick game, phone landing (iOS UA), and confirmation page. Capture screenshots for the owner.
- [ ] Hand the owner these production steps (not done by the agent):
  - apply migration `20261128000000`
  - add `/confirmed` to the Supabase redirect URLs
  - set `ONBOARDING_CUTOFF` to the release date

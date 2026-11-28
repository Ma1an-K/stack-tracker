# First run and phone install: design

Date: 2026-11-28
Status: approved (signed off on the clickable mock)
Mock: https://claude.ai/artifact/EJvA2s8ztJLagPA2kSZKr6 (source: `docs/onboarding-prototype.html`)
Replaces: `2026-04-15-onboarding-tutorial-design.md` and the install step of `2026-04-15-install-prompt-design.md`

## Why

New users don't reach a finished game. Today's first run:

1. Sign up, confirm email, sign in again.
2. A forced Create game / Join with code screen. No homegame means no app. `AppShell` in `src/App.tsx` shows the marketing `LandingPage` on `/` (browser) and redirects every other path to `/auth` when there is no homegame, even for signed-in users.
3. An 8-step tour that points at icons (`src/components/tutorial/tours.ts`). It tells the host to "add your crew" but never helps, so the first tap on + ends at "Seat at least two players". The player tour buries the critical "claim your player" step at step 3.

On top of that:
- One-off games (`oneoff_games`, `/one-off`) need no homegame but are only reachable from the club menu, inside the homegame-gated shell.
- The tour's "seen" flag is in `localStorage`, so it's per browser, not per account.
- The "Homegame created" toast covers tour step 1. The counter says "of 8" but ends at 7 on web, because the install step is skipped.
- Stack Tracker is a phone app, but the phone landing page is the laptop marketing page. Install is one grey line, plus a final tour step that most people skip.

Users arrive as a mix of hosts, invited friends, and people settling one night. Store apps (Capacitor shells are in `ios/` and `android/`) are coming but will take a while. Until then, adding to the home screen is the way onto the phone.

## Goals

- Every new user gets to a useful result (a logged game, a claimed player, or a settled quick game) in their first session.
- Users can get into the app without a homegame.
- On a phone, the first visit's main job is getting Stack Tracker onto the home screen.
- Everything is designed for phone first; laptop is the secondary case.
- The install push can switch to store badges later without being redesigned.

## Non-goals

- Converting a saved one-off game into a homegame. "Play with the same crew?" just opens the host path (decided 2026-11-28; copying is a possible follow-up).
- Changing sign-up itself, including email confirmation.
- Shipping the store apps.
- Redesigning the laptop marketing page beyond its hero.

## Anti-goals

- A tour that explains buttons instead of getting something done.
- Install nagging that never stops, or that shows inside the installed app or the native store app.
- Asking iPhone users to sign up in Safari and then install, which makes them sign in twice.

## Approaches considered

- **A. "What brings you here?" choice, then guided first steps, plus a Home checklist (picked).** One tap routes each kind of user. The guided steps do real work. A checklist on Home picks up anyone who leaves partway.
- B. No question; everyone lands on Home with a checklist. Simpler, but a host and a one-night settler get the same generic screen.
- C. Keep the gate, add "Skip for now", rewrite the tour copy. Cheapest, but it still teaches icons and doesn't fix the dead ends.

For the install push: install before sign-up on phones, then a second ask after a win, then a dismissible Home banner. Asking only after a win was rejected because iPhone home-screen apps don't share sign-in with Safari.

## The design

### 1. Phone landing (signed out, phone browser, not standalone, not native)
- One app-style screen: headline, short line, an illustrated home screen with the Stack Tracker icon.
- Primary: **Add to Home Screen**, which opens the right install help (section 2).
- Secondary: **Continue in browser**, which goes to sign-up / sign-in as today.
- Footer: "Learn more", which opens the existing marketing page.
- Native app (`isNativeApp()`) keeps opening straight on sign-in. Standalone PWA also skips this screen.
- *Builder-check call:* invite links (`/auth?mode=signup&code=…`, built in `src/lib/inviteLink.ts`) opened in a phone browser that isn't standalone or native get this same install-first screen, with the invite code shown. "Continue in browser" carries on to sign-up with the code as today. Invite links keep their current format.

### 1b. After email confirmation in a phone browser (builder-check call)
The confirmation link (`emailRedirectTo` in `src/hooks/useAuth.ts`) opens in the browser, not in the home-screen app. When it lands in a phone browser that isn't standalone, show a small screen: "You're confirmed. Open Stack Tracker from your Home Screen to sign in", with "Continue here instead" as a secondary action. Laptop and standalone carry on as normal.

### 2. Install help by platform
- **iPhone Safari:** three drawn steps (Share → Add to Home Screen → Add, then open from the Home Screen), using Safari's icons, with a pointer at the Share button in Safari's bottom bar. If the visit came from an invite link, show the invite code with "keep this handy, the app asks for it", because the installed app can't read the original link or Safari's storage.
- **Android Chrome:** the button calls the deferred `beforeinstallprompt` (existing `useInstallPrompt`). If no prompt is available, show a short guide: ⋮ menu → Install app.
- **In-app browsers** (WhatsApp, Instagram, Messenger, Facebook and similar): explain that this browser can't add apps, ask the user to open the page in Safari/Chrome (⋯ → Open in Safari), and offer a copy-link button. Also offer "Join here anyway".
- **Laptop:** the marketing hero gets a QR code that opens the site on a phone, plus "Or use it here", which goes to sign-up.

### 3. "What brings you here?" (after first sign-in, no homegame yet)
Replaces the forced create/join screen in `AuthPage`. Three choices:
- **I run a regular game** → host path
- **I've got an invite** → join path
- **Just settle tonight** → quick game path

Arriving with an invite code (link or saved pending code) skips this screen and goes to the join path with the code filled in.

### 4. Host path (4 steps, with a progress bar)
1. Name your game (as today).
2. Add your crew: the host is pre-filled as "You", with inline rows for more names. Continue is enabled at 2 or more players.
   - *Builder-check call:* "You" is created as a real player row with `user_id` set to the host (the owner can claim directly), so the host's results show in My Stats and the row never appears in anyone's "Which one is you?" list. The host can remove the "You" row if they don't play. `createHomegame` creates no player today, so this is new.
3. Invite: show the invite code with Copy link and Share (Web Share where available). "Skip for now".
   - *Builder-check call:* if the homegame has no active `invite_codes` row, create one with the existing defaults (14-day expiry, no use limit). Otherwise reuse the newest active one.
4. Log your first game: **Play live** or **Enter final totals**. Both open the existing session flows with the crew seated. "I'll do this later" goes to Home.
   - New plumbing: `NewSessionPage` reads only `?from=live` today and has no way to pre-select players. It needs one (for example, all active players pre-selected when coming from setup).

This lands on Home with the getting-started checklist (section 7).

### 5. Join path
1. Invite code (as today, pre-filled from link or pending code).
2. **Which one is you?**: the homegame's unclaimed players with game counts. Picking one sends the existing claim request (the host still approves). "I'm not on the list" and "Skip, I'm just watching" are offered.
3. Home as a member, with the claim shown as pending until approved.

### 6. Quick game path and Home without a homegame
- The quick game path opens the existing one-off start flow (`StartGameDialog`, live or totals), then settle and save as today.
- **Home without a homegame** is new. `AppShell` must let signed-in users with no homegame through, replacing the branch that shows the marketing page on `/` to signed-in users.
  - Hero: Start live game / Enter final totals (one-off).
  - Saved one-off games list.
  - Card: "Play with the same crew?" with Start a homegame (host path) and Join with code (join path).
  - Tabs that need a homegame (Sessions, Standings, Players) show the same start-or-join card instead of breaking. The centre + goes to the one-off start.
  - Header shows "Stack Tracker / No homegame yet" in place of the homegame switcher.

### 7. Getting-started checklist (replaces the icon tours)
- Shows on Home for owners of the current homegame: Create your game, Add 2 or more players, Invite your crew, Log your first game.
- Each item is worked out from real data (players count, invite code shared or a second member joined, session count). Nothing is stored for it. It hides itself once all four are done.
- What counts as "Invite your crew" done: at least one other member has joined, or the user tapped Copy/Share in setup or from the checklist. The tap may be remembered locally.
- Members get no checklist. After claiming they see one tip.

### 8. Tips (replaces `OWNER_TOUR` / `PLAYER_TOUR`)
- At most 2–3 one-time tips, each shown the first time the relevant screen is opened (for example "Tap + to log another game" on Home after the first game, and one on My Stats for members).
- The "seen" state is stored on the account, not in `localStorage`. This needs a small migration (for example a `seen_tips text[]` on `profiles`, or a separate table). The policy "Users can update their own profile" already exists, but it doesn't limit which columns can change. That's acceptable for tips.
- Remove the old tour, its context, and the `localStorage` keys.

### 8b. Rollout for existing users (decided 2026-11-28)
New users only. The checklist shows only on homegames created after the rollout date (compare `homegames.created_at` with a constant or config cutoff). The tips migration marks every tip as seen for accounts that exist when it runs, so existing users notice nothing except the install banner and the second ask.

### 9. Repeat install asks (browser only, not standalone, not native)
- **Second ask:** a bottom sheet right after the first success (first game saved, claim sent, or quick game saved): "Keep it one tap away". Show me how / Not now. Not now snoozes for 7 days.
  - *Builder-check call:* "first" means the account's first of that kind, checked from data at save time (it's the account's only session or one-off, or its first claim). A long-time user on a new phone gets the Home banner, not the sheet.
- **Home banner:** after that, a slim banner on Home (icon, "Put Stack Tracker on your Home Screen", How, ×). Two dismissals stop it for good.
- Snooze and dismissal counts can live in `localStorage`. They are per browser on purpose, because installing is per device.

### 10. Store badges later
All install spots (phone landing, second ask, banner, laptop hero) render through one component. When store links exist (config or env), it shows App Store / Google Play badges as the main action, with "or add it from your browser" as a secondary link. No other screen changes.

## Constraints

- Public repo: build is gated on `tsc`, and the 16 deliberate lint warnings stay (see project notes).
- The Supabase MCP is read-only. New migrations go in `supabase/migrations/` and are tested locally (`stack-tracker-admin-local` against local Supabase). The owner applies them to production by hand.
- Existing RLS rules: only owners/admins add players; claims stay host-approved; `oneoff_games` is owner-only.
- Detection must cover standalone (`display-mode: standalone`, `navigator.standalone`), native (`isNativeApp()`), iOS vs Android, and the common in-app browser user agents.

## Left to the builder

- Exact copy beyond what the mock shows, icons, and animation details.
- Component and route structure, and whether the host steps are routes or one stepper.
- Which in-app browser user agents to match, and the QR library (or a small inline encoder).
- Choosing between the `profiles` column and a separate table for tips.
- Test coverage, following the existing vitest patterns (e.g. `Navigation.test.tsx`, `StartGameDialog.test.tsx`).

# One-off Games Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a signed-in user track and settle a single game with no homegame involved, live or from final totals. Nothing is saved unless they choose "Save to my history".

**Architecture:** An in-progress one-off is plain client state, persisted to `localStorage` per user and exposed through an app-level `OneOffGameProvider`. The existing live session tracker UI is lifted out of `LiveSessionPage` and driven by a small `LiveGameController` interface, so the same screen runs on a homegame live session or a local one-off. Saved games go to a new owner-only table, `oneoff_games`, one row per game, with who-pays-whom frozen at save time.

**Tech Stack:** React 18 + TypeScript + Vite, Tailwind/shadcn, React Router 6, Supabase (Postgres + RLS), Vitest + Testing Library, pgTAP (`npm run test:db`).

**Spec:** `docs/superpowers/specs/2026-11-26-one-off-games-design.md`

## Global Constraints

- Public repo. `npm run build` runs `tsc` first and must pass. Lint errors stay at 0. The 16 existing eslint warnings are deliberate: do not "fix" them, and add no new ones.
- No new dependencies.
- Homegame behaviour must be unchanged. The refactored live session screen must behave exactly as it does now for homegame games.
- No one-off data may appear in any homegame (players, sessions, leaderboard, member stats, push notifications, homegame switcher). One-offs must not count toward the 5-homegame limit. An unsaved game must never reach the server.
- Migrations are written and tested locally (`npm run test:db`). They are applied to the live project only with the user's go-ahead, via `supabase db query --linked -f <file>`, never `supabase db push`. The user then runs `npm run gen:types` in Terminal.app (it needs a TTY login).
- Every `localStorage` read and write is wrapped in try/catch.
- Visual design follows `DESIGN_DIRECTION.md` and the existing live session screen (dark, gold accent).
- Copy is sentence case, with no "successfully" and no "please".
- Money comparisons use a 0.01 tolerance. Displayed amounts use 2 decimals via `formatCurrency` (`src/lib/settlement.ts`).
- Commits: conventional style (`feat(oneoff): …`), ending with the session's attribution line. Commit locally only; never push.

## Review Focus

1. **Save fails (offline or server error):** the game must stay on the device, an error shows, and nothing is cleared. Tested in Task 6.
2. **Float drift on decimal buy-ins** (for example 3 × 33.33 against a 99.99 cash-out): a game within 0.01 counts as balanced and settles. Tested in Task 1.
3. **Storage unavailable** (private window, quota, blocked site data): the game keeps working in memory and the screen says it won't survive a refresh. Tested in Tasks 2 and 3.
4. **Removing a player who has a recorded payment:** removal is refused with a message, so the payment never points at a missing player. Tested in Task 3.
5. **Default date near midnight:** `played_on` defaults to the device's local calendar date, not the UTC date. Tested in Task 2.

---

## File structure

| File | Responsibility |
|---|---|
| `src/lib/oneOff/types.ts` | `OneOffPlayer`, `OneOffPayment`, `OneOffGame`, `OneOffTransfer`, `SavedOneOffGame` |
| `src/lib/oneOff/settle.ts` | Payment-aware settlement on plain players, with the balance check |
| `src/lib/oneOff/localStore.ts` | Load, save and clear the in-progress game per user; name validation; local date |
| `src/lib/oneOff/reducer.ts` | Pure state transitions for an in-progress game |
| `src/contexts/OneOffGameContext.tsx` | App-level provider: reducer + persistence + storage-availability flag |
| `src/components/live/LiveGameController.ts` | Interface the tracker UI talks to |
| `src/components/live/TrackerView.tsx`, `SetupView.tsx` | Lifted out of `LiveSessionPage.tsx`, driven by the controller |
| `src/hooks/useOneOffHistory.ts` | List, get, save and delete saved games |
| `src/pages/oneoff/*.tsx` | Hub, live, settle and saved-detail screens |
| `supabase/migrations/20261126000000_oneoff_games.sql`, `supabase/tests/120_oneoff_games.test.sql` | Table, RLS and pgTAP test |

---

### Task 1: Types and payment-aware settlement

**Files:**
- Create: `src/lib/oneOff/types.ts`, `src/lib/oneOff/settle.ts`
- Test: `src/lib/oneOff/settle.test.ts`

**Interfaces:**
- Produces:
  - `interface OneOffPlayer { id: string; name: string; buy_in: number; cash_out: number | null }`. `cash_out` is null while seated in a live game.
  - `interface OneOffPayment { from_id: string; to_id: string; amount: number }`
  - `interface OneOffTransfer { from_id: string; to_id: string; amount: number }`
  - `interface OneOffGame { version: 1; mode: 'live' | 'totals'; label: string; played_on: string /* YYYY-MM-DD */; currency: string; notes: string; default_buy_in: number; started_at: string; players: OneOffPlayer[]; payments: OneOffPayment[] }`
  - `interface SavedOneOffGame { id: string; played_on: string; label: string | null; currency: string; notes: string | null; players: { id: string; name: string; buy_in: number; cash_out: number }[]; payments: OneOffPayment[]; transfers: OneOffTransfer[]; created_at: string }`
  - `settleOneOff(players: { id: string; buy_in: number; cash_out: number }[], payments: OneOffPayment[]): { totalBuyIn: number; totalCashOut: number; difference: number /* cash-outs minus buy-ins */; balanced: boolean; transfers: OneOffTransfer[] }`

- [ ] **Step 1: Write the failing tests** in `settle.test.ts`:
  - `matches the public calculator when there are no payments`: for players A (in 100, out 0), B (in 100, out 150), C (in 100, out 150), the transfers equal `computePublicSettlement` mapped to ids: `[{from_id:'a',to_id:'b',amount:50},{from_id:'a',to_id:'c',amount:50}]`.
  - `payments already made reduce what is owed`: A (in 100, out 0) and B (in 0, out 100), with payment A→B 60, gives `[{from_id:'a',to_id:'b',amount:40}]`.
  - `a fully paid game has no transfers`: same players, payment A→B 100, gives `[]` and `balanced: true`.
  - `unbalanced totals return no transfers`: A (in 100, out 0) and B (in 100, out 195) gives `balanced: false`, `difference: -5`, `transfers: []`.
  - `float drift within 0.01 counts as balanced` (Review Focus 2): three players each buying in 33.33, one cashing out 99.99 and two cashing out 0, gives `balanced: true` and 2 transfers.
  - `payments naming an unknown player are ignored`.
- [ ] **Step 2: Run** `npx vitest run src/lib/oneOff/settle.test.ts`. Expected: FAIL, module not found.
- [ ] **Step 3: Implement `settleOneOff` in `src/lib/oneOff/settle.ts`.** Balance per player = `buy_in - cash_out`, adjusted by payments the same way as `calculateSettlements` (`src/lib/settlement.ts:28-35`). Pair debtors with creditors largest-first, as `computePublicSettlement` does, with a 0.005 threshold and rounding to cents. `balanced = Math.abs(difference) <= 0.01`. When not balanced, return `transfers: []`. Do not modify `settlement.ts` or `publicSettlement.ts`.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit**: `feat(oneoff): payment-aware settlement for one-off games`

### Task 2: Device storage, name validation and local date

**Files:**
- Create: `src/lib/oneOff/localStore.ts`
- Test: `src/lib/oneOff/localStore.test.ts`

**Interfaces:**
- Consumes: `OneOffGame` (Task 1).
- Produces:
  - `storageKey(userId: string): string`, which returns `` `oneoff:v1:${userId}` ``
  - `loadGame(userId: string): OneOffGame | null`. Returns null on a missing key, bad JSON, a wrong `version`, or a storage error.
  - `saveGame(userId: string, game: OneOffGame): boolean`. Returns false if storage threw.
  - `clearGame(userId: string): void`
  - `validateNames(names: string[]): string | null`. Returns null when valid, or an error message for a blank name ("Every player needs a name") or a duplicate ignoring case and surrounding spaces ("Two players are called Dan"; use the second occurrence's trimmed name).
  - `localDate(now?: Date): string`. Returns `YYYY-MM-DD` from the device's local calendar.

- [ ] **Step 1: Write the failing tests**:
  - `saves and restores a game`, plus `clearGame removes it`.
  - `another user's game is not visible`: save under `u1`, then `loadGame('u2')` is null.
  - `corrupt JSON or wrong version returns null`.
  - `storage that throws` (Review Focus 3): stub `localStorage.setItem` and `getItem` to throw; `saveGame` returns false and `loadGame` returns null, with no throw.
  - `validateNames`: `['Dan','dan ']` gives "Two players are called dan"; `['Dan','']` gives "Every player needs a name"; `['Dan','Sam']` gives null.
  - `localDate uses local time` (Review Focus 5): with `vi.stubEnv('TZ','Australia/Melbourne')`, or by building a `Date` from local components, 23:30 local on 2026-11-26 gives `'2026-11-26'`.
- [ ] **Step 2: Run** `npx vitest run src/lib/oneOff/localStore.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the five functions in `localStore.ts`.
- [ ] **Step 4: Run** again. Expected: PASS.
- [ ] **Step 5: Commit**: `feat(oneoff): keep an in-progress one-off on the device per user`

### Task 3: Game reducer and app-level provider

**Files:**
- Create: `src/lib/oneOff/reducer.ts`, `src/contexts/OneOffGameContext.tsx`
- Modify: `src/components/layout/MainLayout.tsx:64-97` (wrap its children with `OneOffGameProvider` inside `LiveSessionProvider`)
- Test: `src/lib/oneOff/reducer.test.ts`, `src/contexts/OneOffGameContext.test.tsx`

**Interfaces:**
- Consumes: Tasks 1 and 2; `useAuthContext()` for `user.id` and `homegame?.currency`.
- Produces:
  - `type OneOffAction = | { type: 'start'; game: OneOffGame } | { type: 'addPlayer'; id: string; name: string; buyIn: number } | { type: 'removePlayer'; id: string } | { type: 'addBuyIn'; id: string; amount: number } | { type: 'setBuyIn'; id: string; total: number } | { type: 'cashOut'; id: string; amount: number } | { type: 'rejoin'; id: string } | { type: 'setCashOut'; id: string; amount: number } | { type: 'renamePlayer'; id: string; name: string } | { type: 'addPayment'; payment: OneOffPayment } | { type: 'removePayment'; index: number } | { type: 'setMeta'; patch: Partial<Pick<OneOffGame,'label'|'played_on'|'currency'|'notes'>> }`
  - `oneOffReducer(state: OneOffGame, action: OneOffAction): { state: OneOffGame; error: string | null }`. Invalid actions return the unchanged state and an error.
  - `useOneOffGame(): { game: OneOffGame | null; storageOk: boolean; seatedCount: number; totalBuyIn: number; totalPot: number; start(input: { mode: 'live'|'totals'; names: string[]; defaultBuyIn: number; label?: string; currency?: string }): { error: string | null }; dispatch(action: OneOffAction): { error: string | null }; discard(): void }`. `discard` clears state and storage. Each player's id comes from `crypto.randomUUID()`.

- [ ] **Step 1: Write the failing reducer tests**:
  - The buy-in, cash-out and rejoin round trip matches homegame live semantics: `addBuyIn` adds; `addBuyIn` with a negative amount never goes below 0; `cashOut` sets `cash_out`; `rejoin` sets it back to null.
  - `addPlayer` and `renamePlayer` reject a blank or duplicate name, using `validateNames` messages.
  - `removePlayer refuses when a payment involves them` (Review Focus 4): error "Remove their payments first", state unchanged.
  - `addPayment` rejects from = to and amount ≤ 0.
- [ ] **Step 2: Write the failing provider tests** (render with a mocked `useAuthContext` returning `user.id 'u1'` and currency `'A$'`):
  - `start` persists to `localStorage` under `oneoff:v1:u1`, and a fresh mount restores it.
  - `start` defaults the currency to the homegame's (`'A$'`) and `played_on` to `localDate()`.
  - `start` needs at least 2 names ("Add at least two players").
  - `storage unavailable keeps the game in memory` (Review Focus 3): with `setItem` throwing, `game` updates and `storageOk` is false.
  - `discard` clears both the state and the key.
- [ ] **Step 3: Run** `npx vitest run src/lib/oneOff src/contexts/OneOffGameContext.test.tsx`. Expected: FAIL.
- [ ] **Step 4: Implement** the reducer and provider. The provider calls `saveGame` after every successful dispatch and sets `storageOk` from its return value. It reloads with `loadGame` when `user.id` changes. Mount it in `MainLayout`.
- [ ] **Step 5: Run** the tests, then `npm run typecheck`. Expected: PASS.
- [ ] **Step 6: Commit**: `feat(oneoff): one-off game state with device persistence`

### Task 4: Lift the live tracker onto a controller (no behaviour change)

**Files:**
- Create: `src/components/live/LiveGameController.ts`, `src/components/live/TrackerView.tsx`, `src/components/live/SetupView.tsx`, `src/components/live/useHomegameLiveController.ts`
- Modify: `src/pages/LiveSessionPage.tsx` (keep the page, header, `DiscardButton` and empty state; render the lifted views with the homegame controller)
- Test: `src/components/live/TrackerView.test.tsx`

**Interfaces:**
- Produces:
  - `interface RosterPlayer { id: string; name: string; is_active: boolean }`
  - `interface LiveGameController { players: { player_id: string; buy_in: number; cash_out?: number }[]; payments: { from_player_id: string; to_player_id: string; amount: number }[]; defaultBuyIn: number; startedAt: string; totalPot: number; totalBuyIn: number; seatedCount: number; roster: RosterPlayer[]; currency: string | undefined; ownerName: string | null; canCreatePlayer: boolean; createPlayer(name: string): Promise<{ error: unknown | null; player: RosterPlayer | null }>; addBuyIn(id: string, amount: number): Promise<{ error: unknown }>; setBuyIn(id: string, total: number): Promise<{ error: unknown }>; addPlayer(id: string, buyIn: number): Promise<{ error: unknown }>; removePlayer(id: string): Promise<{ error: unknown }>; cashOut(id: string, amount: number): Promise<{ error: unknown }>; rejoin(id: string): Promise<{ error: unknown }>; addPayment(p: { from_player_id: string; to_player_id: string; amount: number }): Promise<{ error: unknown }>; removePayment(index: number): Promise<{ error: unknown }>; endHref: string }`. The field names mirror `LiveSessionContextType` and `LiveSession` so the homegame adapter is a thin mapping.
  - `TrackerView({ controller }: { controller: LiveGameController })` and `SetupView({ players, onStart }: { players: RosterPlayer[]; onStart: (p: { player_id: string; buy_in: number }[], defaultBuyIn: number) => Promise<unknown> })`
  - `useHomegameLiveController(): LiveGameController | null`, built from `useLiveSession`, `usePlayers`, `useAuthContext` and `useHomegameMembers`, exactly as `TrackerView` reads them today (`LiveSessionPage.tsx:186-209`). `endHref` is `'/new-session?from=live'`.

- [ ] **Step 1: Write the failing test** `TrackerView.test.tsx` with a fake controller (two seated players, base buy-in 20):
  - Tapping the `+20` chip on a player calls `controller.addBuyIn(id, 20)`.
  - "End" navigates to `controller.endHref`.
  - The pot shows `controller.totalPot` formatted with `controller.currency`.
- [ ] **Step 2: Run** `npx vitest run src/components/live`. Expected: FAIL.
- [ ] **Step 3: Move** `TrackerView`, `SetupView` and their helpers (`NameChip`, `useElapsed`) into `src/components/live/`, replacing every direct context read with the `controller` prop. Write the homegame adapter. `LiveSessionPage` renders `<TrackerView controller={homegameController} />`.
- [ ] **Step 4: Verify no behaviour change:**
  - Run `npm test`. Expected: all suites PASS, the same count as before plus the new ones.
  - Run `npm run build`. Expected: success.
  - Run `npm run lint`. Expected: 0 errors and the same 16 warnings.
  - Manually in the dev preview: start a homegame live game, add a buy-in, cash a player out, record a payment, then End. It lands on `/new-session?from=live` pre-filled as before.
- [ ] **Step 5: Commit**: `refactor(live): drive the live tracker through a controller`

### Task 5: `oneoff_games` table, RLS and pgTAP

**Files:**
- Create: `supabase/migrations/20261126000000_oneoff_games.sql`, `supabase/tests/120_oneoff_games.test.sql`
- Modify: `src/integrations/supabase/types.ts` (hand-add the `oneoff_games` Row, Insert and Update types in the generated format; the user regenerates them later)

**Interfaces:**
- Produces: table `public.oneoff_games` with the columns in the spec's "Saved games (server)" table, including `transfers jsonb not null`; index `oneoff_games_user_played_idx on (user_id, played_on desc)`; RLS enabled with policies `oneoff_games_select_own`, `oneoff_games_insert_own` and `oneoff_games_delete_own`, all `user_id = (select auth.uid())`; no update policy. Grant select, insert and delete to `authenticated`.

- [ ] **Step 1: Write the failing pgTAP test** (style of `010_error_log.test.sql`; seed users A and B):
  - `has_table`
  - A can insert a row (`lives_ok`).
  - A cannot insert with `user_id` = B (`throws_ok '42501'`).
  - A sees 1 row; B sees 0 rows of A's.
  - B's delete of A's row affects 0 rows; A's delete works.
  - An update by A affects 0 rows (no policy).
  - `players`, `payments` and `transfers` are NOT NULL (insert with `players` null throws `23502`).
- [ ] **Step 2: Run** `npm run test:db`. Expected: the new test FAILS and the existing tests pass.
- [ ] **Step 3: Write the migration.**
- [ ] **Step 4: Run** `npm run test:db`. Expected: all PASS. Then `npm run typecheck`. Expected: PASS.
- [ ] **Step 5: Commit**: `feat(db): oneoff_games table with owner-only access`

### Task 6: Saved-games hook

**Files:**
- Create: `src/hooks/useOneOffHistory.ts`
- Test: `src/hooks/useOneOffHistory.test.ts` (use `src/test/supabaseMock.ts`)

**Interfaces:**
- Consumes: `SavedOneOffGame`, `OneOffGame`, `settleOneOff`, `clearGame`.
- Produces: `useOneOffHistory(): { games: SavedOneOffGame[]; loading: boolean; refetch(): Promise<void>; get(id: string): Promise<SavedOneOffGame | null>; save(game: OneOffGame, userId: string): Promise<{ id: string | null; error: string | null }>; remove(id: string): Promise<{ error: string | null }> }`

- [ ] **Step 1: Write the failing tests**:
  - `save` inserts one row whose `transfers` equal `settleOneOff(...)`. Players are mapped with `cash_out` (null is not allowed: `save` refuses with "Cash everyone out first" if any `cash_out` is null). On success it calls `clearGame(userId)` and returns the id.
  - `save refuses an unbalanced game` with "Totals don't balance yet", and makes no insert.
  - `failed save keeps the game on the device` (Review Focus 1): the insert resolves with an error, so `clearGame` is not called and `error` is "Couldn't save. Check your connection and try again."
  - `games` loads ordered by `played_on desc, created_at desc`, and `remove` deletes by id, then refetches.
- [ ] **Step 2: Run** `npx vitest run src/hooks/useOneOffHistory.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the hook. No `homegame_id` anywhere, and no push notifications.
- [ ] **Step 4: Run** the tests. Expected: PASS.
- [ ] **Step 5: Commit**: `feat(oneoff): save, list and delete one-off games`

### Task 7: One-off screens and routes

**Files:**
- Create: `src/pages/oneoff/OneOffHubPage.tsx` (`/one-off`), `src/pages/oneoff/OneOffLivePage.tsx` (`/one-off/live`), `src/pages/oneoff/OneOffSettlePage.tsx` (`/one-off/settle`), `src/pages/oneoff/SavedOneOffPage.tsx` (`/one-off/saved/:id`), `src/components/live/useOneOffLiveController.ts`
- Modify: `src/App.tsx:118-130` (add the four routes inside `AppShell`)
- Test: `src/pages/oneoff/OneOffSettlePage.test.tsx`, `src/pages/oneoff/OneOffHubPage.test.tsx`

**Interfaces:**
- Consumes: `useOneOffGame` (Task 3), `TrackerView`, `SetupView` and `LiveGameController` (Task 4), `useOneOffHistory` (Task 6), `settleOneOff` (Task 1).
- Produces: `useOneOffLiveController(): LiveGameController | null`. It maps the one-off game to the controller: `roster` = the game's players as `{ id, name, is_active: true }`; `canCreatePlayer: true`; `createPlayer` adds a name with buy-in 0 and returns the new player; `ownerName: null`; `endHref: '/one-off/settle'`.

Screen behaviour (from the spec):
- **Hub:**
  - In-progress card with Resume (goes to `/one-off/live` for a live game, or `/one-off/settle` for a totals game) and Discard (confirmation dialog).
  - **Start live game** and **Enter final totals**, each opening a small start form: names (at least 2, validated), label, currency, and for live only the default buy-in. The form calls `start`, then routes. Disable both start buttons while a game is in progress.
  - **Saved games** list: newest first, showing date, label (or "One-off game") and player count. Tapping one opens `/one-off/saved/:id`.
  - If `storageOk` is false, a notice: "This game is only kept until you close or refresh this page."
- **Live:** `<TrackerView controller={…} />` with a header "One-off game" and the label as the eyebrow.
- **Settle:**
  - A `cash_out` of null (still seated after a live game, or not yet entered in a totals game) shows as an empty field and counts as 0 in `settleOneOff`. Save stays disabled until every player has one.
  - Per player: editable buy-in and cash-out, plus add, rename and remove player. Payments list with add and remove. Label, date, currency and notes fields.
  - When `settleOneOff(...).balanced` is false: show "Cash-outs are {currency}{abs} short" or "Cash-outs are {currency}{abs} over", show no transfers, and disable Share and Save.
  - When balanced: show transfers as "{from} pays {to} {amount}".
  - **Share** uses the same plain-text share as `SessionCard.tsx:63-104`.
  - **Save to my history** calls `save`, then routes to `/one-off/saved/:id`.
  - **Done** opens a confirmation ("Close without saving? This game will be gone."), then calls `discard` and routes to `/one-off`.
- **Saved detail:**
  - Date, label, currency, notes; per player buy-in, cash-out and profit; payments; and the stored `transfers`. Do not recompute them.
  - **Share**, and **Delete** with confirmation.
  - If the game is not found: an empty state linking to `/one-off`.

- [ ] **Step 1: Write the failing tests**:
  - Settle with an unbalanced game shows "Cash-outs are A$5.00 short", shows no "pays" lines, and Save is disabled.
  - Balanced: shows "Ann pays Ben A$40.00", and Save calls `history.save`, then navigates to `/one-off/saved/<id>`.
  - Done followed by confirm calls `discard`.
  - Hub with a game in progress shows "Resume", and the start buttons are disabled.
  - Hub with `storageOk` false shows the notice.
- [ ] **Step 2: Run** `npx vitest run src/pages/oneoff`. Expected: FAIL.
- [ ] **Step 3: Implement** the screens, the controller and the routes.
- [ ] **Step 4: Run** the tests and `npm run typecheck`. Expected: PASS.
- [ ] **Step 5: Commit**: `feat(oneoff): one-off hub, live, settle and saved screens`

### Task 8: Entry points (menu tile and centre nav button)

**Files:**
- Modify: `src/components/layout/Header.tsx:274-276` (new `ClubTile` after Calculator, for every member), `src/components/layout/Navigation.tsx:63-110`
- Test: `src/components/layout/Navigation.test.tsx`, `src/components/layout/Header.test.tsx`

**Interfaces:**
- Consumes: `useOneOffGame` (Task 3), `useLiveSession`.

- [ ] **Step 1: Write the failing tests**:
  - Navigation with no homegame live session and a one-off in progress: the centre link has `aria-label="Open live game"`, `href` `/one-off/live` for live mode or `/one-off/settle` for totals mode, and the label "Live".
  - Navigation with both running: the centre link goes to `/live-session`.
  - Navigation with neither: the centre link goes to `/new-session` (unchanged).
  - Header menu: the tile reads "One-off" with no game in progress, and "Resume game" with the player count ("Resume game · 5") when one is in progress. Clicking it navigates to `/one-off`. It is visible when `isOwner` is false.
- [ ] **Step 2: Run** `npx vitest run src/components/layout`. Expected: FAIL.
- [ ] **Step 3: Implement.** Pick a `lucide-react` icon already in the bundle's style (for example `Spade` or `Dices`).
- [ ] **Step 4: Run** the tests, `npm test`, `npm run build` and `npm run lint`. Expected: all PASS, 0 lint errors, and the same 16 warnings.
- [ ] **Step 5: Commit**: `feat(oneoff): reach one-off games from the menu and the live button`

### Task 9: End-to-end check and backlog update

**Files:**
- Modify: `docs/FEATURES.md` (mark feature 1 as built and link the spec and this plan)

- [ ] **Step 1: In the dev preview**, run a live one-off with 3 players:
  - Add buy-ins and record a payment.
  - Leave to the dashboard, check the centre ▶ is pulsing, return through it, then reload the page and check the game is still there.
  - End, and check the totals are off: transfers are hidden and Save is disabled.
  - Fix a number, Save, and check the saved detail matches.
  - Check that the homegame's sessions, leaderboard, players and switcher show nothing new.
- [ ] **Step 2:** Run a final-totals one-off and close it with **Done**. Check that nothing appears in the saved games list.
- [ ] **Step 3:** Run `npm test`, `npm run test:db`, `npm run build` and `npm run lint`. Expected: all pass, with the same 16 warnings.
- [ ] **Step 4: Commit**: `docs: mark one-off games as built`
- [ ] **Step 5: Stop and hand over to the user.** The migration still has to be applied to the live project (with their go-ahead), types regenerated by them in Terminal.app, and the branch pushed only if they ask.

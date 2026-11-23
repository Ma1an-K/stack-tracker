# Live buy-in fixes + local-only admin screen — design

Date: 2026-11-23 · Status: draft, awaiting owner approval

Two independent changes. Part 1 is small; Part 2 is a project.

---

## Part 1 — Live session screen (`src/pages/LiveSessionPage.tsx`, `TrackerView`)

### Why
At the table, the person running the game can't add someone who isn't in the app yet, can't see that the
gold buy-in total is editable, and can't tell what the bare minus button does.

### Goals
1. Create a brand-new player from the live screen and seat them in one step.
2. Edit a player's buy-in total directly by typing.
3. Make the minus button self-explanatory.

### Non-goals
- No change to who may create players. Database rule stays: owner **and** admin (`is_homegame_owner`
  already returns true for both; the app's `isOwner` mirrors it). No migration in Part 1.
- No change to cash-out, payments, or end-session flow.

### Design (decided with owner)
- **Add Player button is always visible** in the Buy-ins header (today it hides when every existing player
  is seated).
- **Add Player dialog:**
  - Owner/admin (`isOwner` from `useAuthContext`): a "New player" name input + "Add & seat" button at the
    top, above the existing bench list. Submitting creates the player (`usePlayers().addPlayer`) and then
    seats them via the live context's `addPlayer(newId, base)` with the standard buy-in. `usePlayers.addPlayer`
    must be changed to return the created player (`{ error, player }`) — keep existing callers working.
    Duplicate name (23505) keeps the existing toast; the dialog stays open.
  - Regular member: no name input; instead a line: *"Only the owner or an admin can create new players.
    Ask {owner name} to make you an admin on the Members page."* They can still seat existing bench players.
  - If the bench is empty, the bench section shows nothing (or a muted "Everyone's already seated").
- **Buy-in total is an inline editable number field** (replaces the gold button for seated players):
  faint pencil icon as affordance; typing **sets the total**; commits on Enter or blur via `setBuyIn`;
  Escape reverts; empty/invalid/negative input reverts without saving; rounded to cents. No save when the
  value is unchanged.
- **Quick-add buttons** (+base, +2×base, Other) unchanged. "Other" keeps its dialog but that dialog now only
  offers "Add to buy-in" (the "Set total" path is now the inline field).
- **Minus button** shows its amount: `−{base}` (text label, not icon-only), same action as today.
- **⋯ menu per seated row** (shadcn `DropdownMenu`) holding "Remove from session" (moved out of the old
  amount dialog). Cash-out keeps its own button.

### Approaches
Only one sensible way: reuse existing `usePlayers.addPlayer`, `isOwner`, and live-context actions; no schema
change. Loosening the players insert policy to all members was considered and rejected by the owner.

---

## Part 2 — Local-only admin screen + error log

### Why
The owner (sole site operator) wants to know whether people use Stack Tracker, which homegames are active,
and what is breaking (failed saves, crashes) so he can fix it. Today no errors are recorded anywhere —
they only reach the user's own console.

### Goals
1. A usage overview: headline numbers, active homegames, recent activity.
2. An issue log of crashes and failed saves with enough detail to reproduce.
3. Maximum security: **no admin capability exists on the deployed site at all.**

### Non-goals
- No alerts/push for errors (owner: "just show it on the admin screen for now").
- No access from phone / deployed site.
- Not a replacement for Sentry-grade stack decoding (no source-map symbolication).

### Anti-goals (failure even if it "works")
- The service-role key reaching the browser, the production bundle, git, or any network peer.
- Any non-owner being able to read usage data or the error log through the public API.
- The error log becoming a spam/abuse vector or causing error loops.

### Approaches considered
| | Approach | Trade-off | Outcome |
|---|---|---|---|
| Data access | A. Deployed `/admin` + DB functions checking a `site_admins` list | Works from phone; risk = a bug in a check on a public surface | Rejected by owner in favour of local-only |
| | B. Deployed edge function with service key | Second deployment; one bug exposes everything | Rejected |
| | **C. Local-only: page excluded from prod build, local dev-server helper holds the service key** | Mac-only; zero admin surface in prod | **Chosen** |
| Error storage | **A. `error_log` table in own Supabase** | Plainer crash detail; everything in one place | **Chosen** |
| | B. Sentry | Richer traces; separate dashboard/account | Rejected |

### Design

#### 2a. Error log (ships to production — write-only)
Migration `supabase/migrations/20261123000000_error_log.sql` (14-digit version like the existing files):
```
error_log(
  id uuid pk default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid null default auth.uid() references auth.users on delete set null,  -- see note
  homegame_id uuid null references homegames on delete set null,
  kind text not null check (kind in ('crash','save_failed')),
  action text check (length(action) <= 200),     -- e.g. 'live.setBuyIn', 'players.add'
  message text not null check (length(message) <= 2000),
  stack text check (length(stack) <= 8000),
  page text check (length(page) <= 300),         -- location.pathname only, no query string
  user_agent text check (length(user_agent) <= 400),
  app_version text check (length(app_version) <= 64),
  fixed_at timestamptz null
)
```
- RLS enabled. **Only one policy:** `INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND
  (homegame_id IS NULL OR is_homegame_member(auth.uid(), homegame_id)))`. No SELECT/UPDATE/DELETE policies →
  only the service role can read/modify. Revoke all from `anon`.
- Index on `created_at desc`.
- Logged-out errors (landing/auth pages) are **not** captured — accepted to avoid an anonymous spam vector.
- `user_id` is nullable so user deletion doesn't fail; the insert check still requires it to equal `auth.uid()`. *(Builder-check fix.)*

Client capture — new `src/lib/errorLog.ts` exporting `logError({ kind, action, error, homegameId? })`:
- Fire-and-forget insert; never throws; never logs its own failure (prevents loops).
- Client throttle: drop exact duplicates (same kind+action+message) within 60 s, and cap at 20 entries per
  page load.
- Strips query strings from `page`; truncates fields to the column limits before sending.
- `app_version`: build-time constant (e.g. git short SHA via Vite `define`, fallback `'dev'`).
- No-op when there is no session.

Hook points:
- **Crashes:** a root React error boundary (wrapping routes in `App.tsx`, with a friendly "Something went
  wrong — reload" fallback) plus `window` `error` and `unhandledrejection` listeners → `kind: 'crash'`.
  Must be SSR-safe (`entry-server.tsx` exists): register listeners only in the browser.
- **Failed saves:** every *write* path's catch block in the hooks/contexts (`usePlayers`, `useSessions`,
  `LiveSessionContext`, `useHomegameMembers`, `useInviteCodes`, `usePlayerClaims`, `useAuth` writes,
  `usePushNotifications` subscribe) calls `logError({ kind: 'save_failed', action: '<hook>.<fn>', ... })`
  next to the existing `console.error`/destructive toast. Reads are not logged.

Retention: the local admin helper deletes rows older than 90 days each time the admin screen loads.

#### 2b. Admin screen (local only — never in production)
- **Route `/admin`** registered in `App.tsx` only inside `if (__ADMIN_ENABLED__)`, a compile-time constant set
  via Vite `define` to `true` **only when `command === 'serve'`** (the dev server) and `false` for every
  `vite build`, including `build:dev` (where `import.meta.env.DEV` would be true — so `DEV` is not used as the
  guard). The page is loaded via `lazy(() => import('./pages/AdminPage'))` inside that branch so builds
  tree-shake it out. Verification: after both `npm run build` and `npm run build:dev`, grep `dist/` for an
  admin-page marker string and for `__admin` — must be absent. *(My call; Vercel deploys `npm run build`.)*
- **Local helper = Vite dev-server plugin** (`scripts/vite-admin-plugin.ts`, `apply: 'serve'`) mounting
  middleware at `/__admin/api/*`:
  - Reads `SUPABASE_SERVICE_ROLE_KEY` (and the project URL) via `loadEnv(mode, cwd, '')` from git-ignored
    `.env.local`. Name has **no `VITE_` prefix** so Vite never exposes it to client code. Add a commented
    placeholder to `.env.example`.
  - **Rejects any request whose socket remote address is not loopback** (`127.0.0.1`, `::1`,
    `::ffff:127.0.0.1`) with 403 — required because `server.host` is `"::"` (LAN-reachable).
  - Also requires a same-origin check (`Origin`/`Host` = localhost) to block DNS-rebinding/cross-site calls.
  - If the key is missing, endpoints return a clear "set SUPABASE_SERVICE_ROLE_KEY in .env.local" error.
  - Uses `@supabase/supabase-js` with the service key server-side only; responses are aggregated JSON.
- **Queries** (separate migration `20261123000100_admin_functions.sql`): move the useful blocks of `scripts/app_overview.sql` into Postgres functions
  `admin_overview()`, `admin_homegames()`, `admin_recent_activity()` in a migration, `SECURITY DEFINER`,
  `REVOKE EXECUTE ... FROM public, anon, authenticated; GRANT EXECUTE ... TO service_role`. The helper calls
  them via `.rpc()`. Error log read/mark-fixed/cleanup go through the service client directly. (Builder's
  call whether to keep the SQL file afterwards; it's currently untracked.)
- **Endpoints:** `GET overview`, `GET homegames`, `GET activity`, `GET errors?status=open|fixed|all`,
  `POST errors/:id/fix`, `POST errors/:id/reopen`.

Screen sections (dark theme, existing UI kit):
1. **Headline:** total users; active 7d / 30d (by `last_sign_in_at`); new signups 7d; homegames;
   sessions logged 7d; live games running now.
2. **Active homegames:** name, owner, members, players, last session date, sessions in last 30 d,
   "Live now" badge; sorted by most recent activity (latest of last session / live session update).
3. **Recent activity:** latest signups, new homegames, member joins, sessions logged (last 30 d).
4. **Issue log:** newest first, filter open/fixed; each row: time, kind, action, message, page, user
   (username#discriminator), homegame, device; expandable stack; "Mark fixed"/"Reopen".

#### Tests
- **DB test setup (owner decision: local database).** The project has no DB tests today and the only database
  is production. First task: run Supabase locally (`supabase start`, Docker), rebuild from
  `supabase/migrations`, and compare against production's schema (`remote_schema.sql` / `supabase db diff`).
  If the migrations have drifted from production, stop and report the drift to the owner before adding new
  migrations. Add pgTAP tests under `supabase/tests/` run with `supabase test db`, plus an npm script.
  **Never run tests against the production project.**
- DB tests (pgTAP, local only): authenticated user can insert own error row; cannot
  insert with another `user_id` or a homegame they're not in; cannot select/update/delete any row; anon
  cannot insert; `admin_*` functions are not executable by `anon`/`authenticated`.
- Unit: `errorLog` throttle/dedupe/truncation/no-session no-op; admin plugin rejects non-loopback and missing
  key.
- Part 1: component tests for the inline buy-in field (commit/escape/invalid), member vs owner Add Player
  dialog, minus label.
- Build gate: `tsc` + build must pass (public-release convention); dist grep check above.

### Deployment notes
- The `error_log` and `admin_*` migrations must be pushed to the hosted Supabase project; frontend deploys via
  Vercel. **Nothing is pushed without the owner's explicit go-ahead.**

### Left to the builder
`TrackerView` receives `players` from the parent's `usePlayers` instance; "Add & seat" must create through that
same instance (pass `addPlayer` down) or the new player renders as "Unknown". Exact component structure, styling details, whether the inline field uses a controlled `Input` or a
contentEditable-free custom component, test file layout.

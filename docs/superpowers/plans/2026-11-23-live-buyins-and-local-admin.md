# Live Buy-ins + Local Admin Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the live-session buy-in screen (create+seat new players, inline editable totals, labelled minus, ⋯ menu) and add a local-only admin screen with usage stats and an error log.

**Architecture:** Part 1 is pure frontend in `LiveSessionPage.tsx`, split into two small testable components. Part 2 adds a write-only `error_log` table plus service-role-only SQL functions (tested on a local Supabase), a client `logError` helper wired into crash and failed-save paths, and a Vite dev-server plugin that holds the service key and serves `/__admin/api/*` to a dev-only `/admin` page.

**Tech Stack:** React 18 + Vite 5 + TypeScript + Tailwind/shadcn, Supabase (Postgres, RLS, pgTAP via `supabase test db`), Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-23-live-buyins-and-local-admin-design.md`

## Global Constraints

- **Never push** (git or `supabase db push`) without the owner's explicit per-push permission. Commit locally only.
- Git identity for this repo: `Ma1an-K` (already configured). Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Never run tests or writes against the production Supabase project** (`ebfhvwadfazehvhevsle`). DB tests run on local Supabase only.
- Build is gated on `tsc` (`npm run build` runs `npm run typecheck` first). It must pass at the end of every task that touches `src/`.
- 16 existing lint warnings are deliberately left — don't "fix" unrelated lint.
- UI is dark-only with the gold accent; use existing shadcn components in `src/components/ui/`.
- Who may create players is unchanged: owner and admin (`isOwner` from `useAuthContext`; DB `is_homegame_owner`). No players-policy change.
- Service key env var: `SUPABASE_SERVICE_ROLE_KEY` in git-ignored `.env.local`, **no `VITE_` prefix**. It must never reach client code, `dist/`, or git.
- Admin gate constant: `__ADMIN_ENABLED__`, `true` only when Vite `command === 'serve'`, `false` for every build (including `build:dev`) and in Vitest.
- Migration filenames use 14-digit versions: `20261123000000_error_log.sql`, `20261123000100_admin_functions.sql`.
- Error-log column limits: action ≤200, message ≤2000, stack ≤8000, page ≤300, user_agent ≤400, app_version ≤64. `kind` ∈ `('crash','save_failed')`.
- Client throttle: drop duplicates (same kind+action+message) within 60 s; max 20 entries per page load.
- Retention: rows older than 90 days deleted when the admin screen loads.

## Review Focus

1. **Remote update while editing a buy-in** — another member's change arrives over realtime while you're typing: your draft must not be overwritten; when the field isn't focused it must show the latest value. (Task 1 test.)
2. **Junk numeric input** (`"abc"`, `""`, `"-20"`, `"12.345"`) in the buy-in field — reverts or rounds to cents; never saves NaN/negative. (Task 1 test.)
3. **Duplicate name in "Add & seat"** — no seat call, dialog stays open, name kept. (Task 2 test.)
4. **Error logger failing** (network down, insert rejected) — must not throw, recurse, or log its own failure. (Task 6 test.)
5. **Admin helper with missing key or unreachable Supabase** — returns a JSON error with a clear message, dev server keeps running. (Task 8 test.)

---

## Part 1 — Live session screen

### Task 1: `BuyInField` inline editable total

**Files:**
- Create: `src/components/sessions/BuyInField.tsx`
- Test: `src/components/sessions/BuyInField.test.tsx`

**Interfaces:**
- Produces: `BuyInField({ value: number; currency?: string; onCommit: (total: number) => void; label: string })` — `label` is the accessible name, e.g. `"Buy-in total for Sam"`.

- [ ] **Step 1: Write failing tests** (`render`, `screen`, `fireEvent`/`userEvent` from Testing Library):
  - `shows the formatted value when not editing` — value 100 → display contains `formatCurrency(100)` and a pencil icon (`aria-hidden`).
  - `commits typed total on Enter` — focus, clear, type `150`, Enter → `onCommit` called once with `150`.
  - `commits on blur` — type `75`, blur → `onCommit(75)`.
  - `Escape reverts without commit` — type `999`, Escape → `onCommit` not called, display back to 100.
  - `ignores invalid input` — for each of `""`, `"abc"`, `"-20"`: type, Enter → `onCommit` not called, reverts to 100.
  - `rounds to cents` — `"12.345"` → `onCommit(12.35)`.
  - `no commit when unchanged` — focus, Enter without editing → not called.
  - `remote value change while not focused updates display` — rerender with `value={200}` → shows 200.
  - `remote value change while focused keeps the draft` — focus, type `130`, rerender `value={200}` → input still `130`; Enter → `onCommit(130)`.
- [ ] **Step 2: Run** `npx vitest run src/components/sessions/BuyInField.test.tsx` — expect FAIL (module not found).
- [ ] **Step 3: Implement** with a local `draft` state and `editing` flag; render an `Input type="number" inputMode="decimal" step="0.01" min="0"` styled like the old gold amount (`text-lg font-bold tabular-nums text-gold`, transparent background, right-aligned) plus a `Pencil` icon from lucide. Sync `draft` from `value` only while not editing. Round with `Math.round(n * 100) / 100`.
- [ ] **Step 4: Run** the test file — expect PASS.
- [ ] **Step 5: Commit** `feat(live): inline editable buy-in total field`.

### Task 2: `AddPlayerDialog` with create-and-seat

**Files:**
- Create: `src/components/sessions/AddPlayerDialog.tsx`
- Test: `src/components/sessions/AddPlayerDialog.test.tsx`
- Modify: `src/hooks/usePlayers.ts` (`addPlayer` return value)

**Interfaces:**
- Modifies: `usePlayers().addPlayer(name: string): Promise<{ error: unknown | null; player: Player | null }>` — add `player` (the inserted row, `null` on error). Existing callers (`PlayersPage` → `PlayerList` `onAddPlayer`) only read `error`; keep them compiling.
- Produces: `AddPlayerDialog({ open: boolean; onOpenChange: (o: boolean) => void; bench: Player[]; canCreate: boolean; ownerName: string | null; baseBuyIn: number; currency?: string; onSeat: (playerId: string) => Promise<unknown>; onCreate: (name: string) => Promise<{ error: unknown | null; player: Player | null }> })`.

- [ ] **Step 1: Write failing tests:**
  - `owner sees new-player input` — `canCreate` true → textbox labelled "New player" and button "Add & seat".
  - `creates then seats` — type `Dana`, click "Add & seat" → `onCreate('Dana')` then `onSeat(<returned id>)`, `onOpenChange(false)`.
  - `trims and rejects blank names` — `"   "` → button disabled; `"  Dana "` → `onCreate('Dana')`.
  - `duplicate name keeps dialog open` — `onCreate` resolves `{ error: {code:'23505'}, player: null }` → `onSeat` not called, `onOpenChange(false)` not called, input still `Dana`.
  - `member sees permission message` — `canCreate` false, `ownerName` `"Matan"` → no "New player" textbox; text `Only the owner or an admin can create new players. Ask Matan to make you an admin on the Members page.`
  - `member message without owner name` — `ownerName` null → `Ask the owner to make you an admin…`.
  - `bench buttons seat existing players` — click bench player `Sam` → `onSeat(sam.id)`, closes.
  - `empty bench` — `bench=[]` → text `Everyone's already seated`.
  - Subtitle shows `Joins with a {formatCurrency(baseBuyIn)} buy-in — adjust after.`
- [ ] **Step 2: Run** `npx vitest run src/components/sessions/AddPlayerDialog.test.tsx` — expect FAIL.
- [ ] **Step 3: Implement** `AddPlayerDialog` (shadcn `Dialog`, `Input`, `Button`; form submit on Enter) and change `usePlayers.addPlayer` to return `{ error: null, player: data as Player }` / `{ error: err, player: null }`.
- [ ] **Step 4: Run** the test file and `npm run typecheck` — expect PASS.
- [ ] **Step 5: Commit** `feat(live): add-player dialog can create and seat new players`.

### Task 3: Wire the tracker rows

**Files:**
- Modify: `src/pages/LiveSessionPage.tsx` (`TrackerView`, `LiveSessionPage`)

**Interfaces:**
- Consumes: `BuyInField` (Task 1), `AddPlayerDialog` + `usePlayers.addPlayer` return shape (Task 2), `useHomegameMembers(homegameId)` (members with `role` and `profile.username`), live context `setBuyIn`, `addBuyIn`, `addPlayer`, `removePlayer`.

- [ ] **Step 1: Change `TrackerView` props** to `{ players: Player[]; createPlayer: (name: string) => Promise<{ error: unknown | null; player: Player | null }> }`; `LiveSessionPage` passes `addPlayer` from its single `usePlayers` instance (so the new player is in `players` and doesn't render as "Unknown").
- [ ] **Step 2: Seated row:** replace the gold amount `<button>` with `<BuyInField value={Number(sp.buy_in)} currency={currency} label={`Buy-in total for ${name}`} onCommit={t => setBuyIn(sp.player_id, t)} />`.
- [ ] **Step 3: Minus button:** show text `−{base}` (U+2212) next to/instead of the icon; keep `aria-label` `Remove ${base} from ${name}` and the existing action/disabled rule.
- [ ] **Step 4: ⋯ menu:** add a shadcn `DropdownMenu` (trigger: `MoreHorizontal` icon button, `aria-label` `More options for ${name}`) with one item "Remove from session" → `removePlayer(sp.player_id)`. Remove that button from the custom-amount dialog.
- [ ] **Step 5: "Other" dialog:** remove the "Set total to this" button; only "Add to buy-in" remains.
- [ ] **Step 6: Add Player:** button always visible (drop the `bench.length > 0` condition); render `AddPlayerDialog` with `canCreate={isOwner}`, `ownerName` = username of the member whose `role === 'owner'` (from `useHomegameMembers(homegame?.id)`), `onSeat={id => addPlayer(id, base)}`, `onCreate={createPlayer}`.
- [ ] **Step 7: Verify:** `npm run typecheck && npm test` pass; then `npm run dev`, open `/live-session` with a running session in the browser and check: edit total, Escape, minus label, ⋯ remove, Add & seat new name, duplicate name toast. (Use an owner account and a member account if available; otherwise note which was not checked.)
- [ ] **Step 8: Commit** `feat(live): inline totals, labelled minus, row menu, always-on Add Player`.

---

## Part 2 — Error log + local admin screen

### Task 4: Local Supabase + DB test harness (drift gate)

**Files:**
- Create: `supabase/tests/000_smoke.test.sql`
- Modify: `package.json` (script `"test:db": "supabase test db"`)

- [ ] **Step 1:** Ensure Docker is running; `supabase start` in the repo. Expected: local API/DB URLs printed. If `config.toml` needs changes to start, make the minimum change and note it.
- [ ] **Step 2: Drift check.** `supabase db reset` (applies all migrations to local). Then `supabase db dump --local --schema public -f /tmp/<scratch>/local_schema.sql` and diff against the untracked `remote_schema.sql` (production dump). Ignore ordering/whitespace/ownership noise.
- [ ] **Step 3: GATE.** If tables, columns, policies, functions, or triggers differ in a way that matters, **STOP and report the differences to the owner**. Do not add migrations until the owner decides. If only noise, record "no functional drift" in the task report.
- [ ] **Step 4:** Write `000_smoke.test.sql`: `begin; select plan(2); select has_table('public','players'); select has_function('public','is_homegame_owner',ARRAY['uuid','uuid']); select * from finish(); rollback;` (create `pgtap` extension in the test if not present).
- [ ] **Step 5: Run** `npm run test:db` — expect 2/2 pass.
- [ ] **Step 6: Commit** `test(db): local pgTAP harness`.

### Task 5: `error_log` table (write-only from the app)

**Files:**
- Create: `supabase/migrations/20261123000000_error_log.sql`
- Test: `supabase/tests/010_error_log.test.sql`

**Interfaces:**
- Produces: table `public.error_log` exactly as in the spec (columns, limits, `user_id uuid null default auth.uid() references auth.users on delete set null`, `fixed_at timestamptz null`, index on `created_at desc`), RLS on, single policy `"Members can log their own errors"` `FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND (homegame_id IS NULL OR public.is_homegame_member(auth.uid(), homegame_id)))`; `REVOKE ALL ON public.error_log FROM anon`; grant `INSERT` only to `authenticated`.

- [ ] **Step 1: Write failing pgTAP tests** (create two users + a homegame with user A as member via `auth.users`/`homegame_members` inserts; switch with `set local role authenticated; set local request.jwt.claims = '{"sub":"<uuid>"}'`):
  - A inserts own row with no homegame → `lives_ok`.
  - A inserts own row for A's homegame → `lives_ok`.
  - A inserts with `user_id` = B → `throws_ok` (RLS violation `42501`).
  - B inserts with A's homegame → `throws_ok`.
  - A `select count(*) from error_log` → `0` rows visible (`is(..., 0)`).
  - A `update`/`delete` affects 0 rows.
  - `set local role anon` insert → `throws_ok`.
  - `kind = 'other'` → `throws_ok` (check violation); message of 2001 chars → `throws_ok`.
- [ ] **Step 2: Run** `npm run test:db` — expect FAIL (table missing).
- [ ] **Step 3: Write the migration.**
- [ ] **Step 4: Run** `supabase db reset && npm run test:db` — expect PASS.
- [ ] **Step 5:** Regenerate local types: `supabase gen types typescript --local > src/integrations/supabase/types.ts`; confirm the diff only adds `error_log` (if it shows unrelated changes, revert and add the `error_log` type by hand instead). `npm run typecheck`.
- [ ] **Step 6: Commit** `feat(db): write-only error_log table`.

### Task 6: Client error capture

**Files:**
- Create: `src/lib/errorLog.ts`, `src/components/ErrorBoundary.tsx`
- Test: `src/lib/errorLog.test.ts`, `src/components/ErrorBoundary.test.tsx`
- Modify: `src/main.tsx` (listeners), `src/App.tsx` (boundary), `vite.config.ts` + `src/vite-env.d.ts` (`__APP_VERSION__`), `vitest.config.ts` (define), write-path catch blocks in `src/hooks/usePlayers.ts`, `useSessions.ts`, `useHomegameMembers.ts`, `useInviteCodes.ts`, `usePlayerClaims.ts`, `useAuth.ts`, `usePushNotifications.ts`, `src/contexts/LiveSessionContext.tsx`

**Interfaces:**
- Produces: `logError(input: { kind: 'crash' | 'save_failed'; action?: string; error: unknown; homegameId?: string | null }): void` and `__resetErrorLogForTests(): void`.
- Produces: `<ErrorBoundary>` — catches render errors, calls `logError({ kind: 'crash', action: 'render', error })`, shows fallback "Something went wrong" + "Reload" button (`window.location.reload()`).
- Produces: `installGlobalErrorHandlers(): void` — `window` `error` + `unhandledrejection` → `logError({ kind: 'crash', action: 'window.error' | 'unhandledrejection', ... })`; idempotent.
- `__APP_VERSION__`: Vite `define` = git short SHA (`execSync('git rev-parse --short HEAD')`, fallback `'dev'`); Vitest defines `'test'`.

- [ ] **Step 1: Write failing tests** (mock `@/integrations/supabase/client`: `auth.getSession` and `from('error_log').insert`):
  - `inserts a truncated row` — message of 3000 chars → inserted `message.length === 2000`; stack ≤ 8000; `page` = `location.pathname` with no query string (set `history.pushState({}, '', '/live?x=1')` → `'/live'`); `user_agent` ≤ 400; `app_version === 'test'`; `homegame_id` passed through.
  - `no session → no insert`.
  - `dedupes within 60s` — same kind+action+message twice → 1 insert; advance fake timers 61 s → second insert allowed.
  - `caps at 20 per page load` — 25 distinct messages → 20 inserts.
  - `never throws when insert rejects` — insert returns rejected promise → `logError` returns normally, no unhandled rejection, insert not retried, no second `logError` call (spy).
  - `accepts non-Error values` — `error: 'boom'` → message `'boom'`; `error: {message:'x'}` → `'x'`.
  - ErrorBoundary: child that throws → fallback text rendered and `logError` called with `kind:'crash'`.
- [ ] **Step 2: Run** `npx vitest run src/lib/errorLog.test.ts src/components/ErrorBoundary.test.tsx` — expect FAIL.
- [ ] **Step 3: Implement** `errorLog.ts`, `ErrorBoundary.tsx`, `installGlobalErrorHandlers` (in `errorLog.ts`), `define`s. Call `installGlobalErrorHandlers()` in `main.tsx` only (not `entry-server.tsx`). Wrap `<AppRoutes />` in `<ErrorBoundary>` in `App.tsx`.
- [ ] **Step 4: Run** tests — expect PASS.
- [ ] **Step 5: Wire failed saves.** In every catch block of an insert/update/delete/rpc/upsert call in the listed hooks/context, add `logError({ kind: 'save_failed', action: '<hookName>.<fnName>', error: err, homegameId })` beside the existing `console.error`. Read paths (fetch/select only) are **not** logged. Action names follow `usePlayers.addPlayer`, `liveSession.persist`, etc.
- [ ] **Step 6: Verify** `npm run typecheck && npm test`.
- [ ] **Step 7: Commit** `feat: capture crashes and failed saves to error_log`.

### Task 7: Service-role-only admin SQL functions

**Files:**
- Create: `supabase/migrations/20261123000100_admin_functions.sql`
- Test: `supabase/tests/020_admin_functions.test.sql`

**Interfaces** (all `SECURITY DEFINER`, `SET search_path = public`, `REVOKE EXECUTE ... FROM public, anon, authenticated`, `GRANT EXECUTE ... TO service_role`):
- `admin_overview() returns jsonb` — keys: `users_total`, `users_active_7d`, `users_active_30d` (by `auth.users.last_sign_in_at`), `signups_7d`, `homegames_total`, `sessions_7d`, `live_now` (count of `live_sessions`), `errors_open` (error_log where `fixed_at is null`).
- `admin_homegames() returns table(id uuid, name text, owner text, members int, players int, last_session date, sessions_30d int, live_now boolean, last_activity timestamptz)` — `owner` = `username || '#' || discriminator`; `last_activity` = greatest(last session `created_at`, live session `updated_at`, homegame `created_at`); ordered by `last_activity desc`.
- `admin_recent_activity(p_days int default 30) returns jsonb` — keys `signups`, `homegames`, `joins`, `sessions`, each an array (newest first, max 50) of `{at, label, detail}` objects built from the blocks 4–7 of `scripts/app_overview.sql`.
- `admin_errors(p_status text default 'open') returns table(id uuid, created_at timestamptz, kind text, action text, message text, stack text, page text, user_agent text, app_version text, fixed_at timestamptz, user_label text, homegame_name text)` — `p_status` ∈ `open|fixed|all` (else raise); newest first; max 500.

- [ ] **Step 1: Write failing pgTAP tests:**
  - For each of the four functions: `ok(not has_function_privilege('anon', '<sig>', 'execute'))`, same for `authenticated`; `ok(has_function_privilege('service_role', '<sig>', 'execute'))`.
  - Seed 1 user, 1 homegame, 1 session today, 1 live session, 2 error rows (one fixed) → as `service_role`: `admin_overview()->>'live_now' = '1'`, `->>'errors_open' = '1'`; `admin_homegames()` returns the homegame with `live_now = true`, `sessions_30d = 1`; `admin_errors('open')` returns 1 row, `admin_errors('all')` 2; `admin_errors('bogus')` throws.
- [ ] **Step 2: Run** `npm run test:db` — FAIL.
- [ ] **Step 3: Write the migration.**
- [ ] **Step 4: Run** `supabase db reset && npm run test:db` — PASS.
- [ ] **Step 5: Commit** `feat(db): service-role-only admin report functions`. Leave `scripts/app_overview.sql` untracked and untouched.

### Task 8: Vite admin dev plugin

**Files:**
- Create: `scripts/admin/adminApi.ts`, `scripts/admin/vitePlugin.ts`
- Test: `scripts/admin/adminApi.test.ts` (top line `// @vitest-environment node`)
- Modify: `vitest.config.ts` (`include` adds `scripts/**/*.test.ts`), `vite.config.ts` (register plugin; `define.__ADMIN_ENABLED__ = JSON.stringify(command === 'serve')`), `tsconfig.node.json` (include `scripts/admin/**/*.ts`), `.env.example` (commented `# SUPABASE_SERVICE_ROLE_KEY=` line under a "local admin only — put in .env.local" note)

**Interfaces:**
- Produces: `isLoopback(remoteAddress: string | undefined): boolean` — true only for `127.0.0.1`, `::1`, `::ffff:127.0.0.1`.
- Produces: `isSameOrigin(headers: { host?: string; origin?: string }): boolean` — host must be `localhost:<port>`/`127.0.0.1:<port>`/`[::1]:<port>`; `origin`, if present, must match `http://` + host.
- Produces: `createAdminHandler(getClient: () => SupabaseClient | null): (req: IncomingMessage, res: ServerResponse) => Promise<void>` handling, under `/__admin/api/`: `GET overview` → `rpc('admin_overview')`; `GET homegames`; `GET activity`; `GET errors?status=`; `POST errors/:id/fix` (set `fixed_at = now()`); `POST errors/:id/reopen` (set `null`). On `GET overview` it first deletes `error_log` rows older than 90 days. Responses `application/json`; failures `{ error: string }` with 4xx/5xx; never throws out of the handler.
- Produces: `adminPlugin(): Plugin` — `apply: 'serve'`; in `configureServer`, loads env with `loadEnv(mode, root, '')`, builds the service client only if `SUPABASE_SERVICE_ROLE_KEY` and `VITE_SUPABASE_URL` exist (`auth: { persistSession: false, autoRefreshToken: false }`), mounts middleware on `/__admin/api` that returns 403 unless `isLoopback(req.socket.remoteAddress) && isSameOrigin(req.headers)`.

- [ ] **Step 1: Write failing tests:**
  - `isLoopback`: true for the three loopback forms; false for `192.168.1.20`, `::ffff:192.168.1.20`, `undefined`.
  - `isSameOrigin`: true for `{host:'localhost:8080'}` and `{host:'localhost:8080', origin:'http://localhost:8080'}`; false for `{host:'192.168.1.5:8080'}`, `{host:'evil.com'}`, `{host:'localhost:8080', origin:'http://evil.com'}`.
  - Handler with `getClient` → `null`: `GET /__admin/api/overview` → 503, body `{ error: 'Set SUPABASE_SERVICE_ROLE_KEY in .env.local and restart npm run dev' }`.
  - Handler with fake client whose `rpc` rejects → 502 JSON `{ error }`, handler resolves.
  - `GET overview` calls delete on `error_log` with `created_at` < now − 90 days before `rpc('admin_overview')`.
  - `GET errors?status=fixed` → `rpc('admin_errors', { p_status: 'fixed' })`; `POST errors/abc/fix` → update `fixed_at` set for id `abc`; unknown route → 404; `GET errors/abc/fix` → 405.
- [ ] **Step 2: Run** `npx vitest run scripts/admin/adminApi.test.ts` — FAIL.
- [ ] **Step 3: Implement** both files and the config changes.
- [ ] **Step 4: Run** the test file and `npm run typecheck` — PASS.
- [ ] **Step 5: Commit** `feat(admin): local-only dev-server admin API`.

### Task 9: Admin page (dev server only)

**Files:**
- Create: `src/pages/AdminPage.tsx`
- Test: `src/pages/AdminPage.test.tsx`
- Modify: `src/App.tsx` (route), `src/vite-env.d.ts` (`declare const __ADMIN_ENABLED__: boolean; declare const __APP_VERSION__: string;`), `vitest.config.ts` (`define: { __ADMIN_ENABLED__: 'false', __APP_VERSION__: '"test"' }` if not already)

**Interfaces:**
- Consumes: endpoints from Task 8 (same-origin `fetch('/__admin/api/...')`).
- Produces: route `/admin`, registered only inside `if (__ADMIN_ENABLED__)` using `const AdminPage = lazy(() => import('./pages/AdminPage'))` defined in that branch; rendered outside `ProtectedRoute`/`MainLayout` (no login needed — access is controlled by the loopback-only helper). Page includes the marker text `Stack Tracker Admin` in its heading.

- [ ] **Step 1: Write failing tests** (mock `fetch`):
  - Renders four sections: headline tiles (labels `Users`, `Active 7d`, `Active 30d`, `New signups 7d`, `Homegames`, `Sessions 7d`, `Live now`, `Open issues`), "Active homegames" table (with `Live now` badge where `live_now`), "Recent activity", "Issue log".
  - Issue log defaults to `status=open`; switching the filter to "Fixed" refetches `errors?status=fixed`.
  - "Mark fixed" posts `errors/<id>/fix` then refetches; row expands to show `stack`.
  - 503 from overview → shows the server's `error` message text.
- [ ] **Step 2: Run** `npx vitest run src/pages/AdminPage.test.tsx` — FAIL.
- [ ] **Step 3: Implement** the page (existing `Card`, `Table`, `Badge`, `Button`, `Tabs` from `src/components/ui/`) and route.
- [ ] **Step 4: Run** tests + `npm run typecheck` — PASS.
- [ ] **Step 5: Commit** `feat(admin): local admin page with usage and issue log`.

### Task 10: End-to-end verification

- [ ] **Step 1:** `npm run typecheck && npm test && npm run test:db` — all pass.
- [ ] **Step 2: Build exclusion.** `npm run build` then `grep -rl "Stack Tracker Admin\|__admin\|SUPABASE_SERVICE_ROLE_KEY\|service_role" dist/` → no output. Repeat after `npm run build:dev`. Then `git grep -n "eyJ" -- . ':!*.lock'` shows no service key; `git status` shows `.env.local` not tracked.
- [ ] **Step 3: Local run against local Supabase.** Point a dev run at local Supabase (temporary `.env.local` with local URL/anon/service keys from `supabase status`), seed a homegame, trigger a failed save (e.g. stop the DB mid-action or call `logError` from the console), open `http://localhost:8080/admin`: tiles, homegames, activity and the error row show; Mark fixed works.
- [ ] **Step 4: LAN refusal.** `curl -s -o /dev/null -w '%{http_code}' http://<mac LAN IP>:8080/__admin/api/overview` → `403`; `curl -H 'Origin: http://evil.com' http://localhost:8080/__admin/api/overview` → `403`.
- [ ] **Step 5: Report** to the owner: results, anything not verified, and that the two migrations still need `supabase db push` to production **with his permission** before the live error log/admin data work against prod (the admin page then needs the prod service key in `.env.local`).

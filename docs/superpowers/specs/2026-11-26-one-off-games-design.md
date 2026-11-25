# One-off games: design

Date: 2026-11-26
Status: ready for approval (builder check done)
Backlog item: `docs/FEATURES.md` § 1

## Intent

A Stack Tracker user who already has a regular homegame sometimes plays somewhere else: a
friend's game, a work game, a trip. They still want Stack Tracker to run the money for that night.
Today the only way to do that in the app is to add the game to their homegame (which corrupts that
group's leaderboard and stats with people who weren't there) or to create a throwaway homegame.
The free public calculator settles the money but can't track buy-ins live and forgets everything.

One-off games let a signed-in user track and settle a single game with no homegame involved, and
keep it only if they want to.

## Goals

- Start a one-off game from the top-right club menu, without creating or changing any homegame.
- Two ways to run it, both ending on the same settle screen:
  - **Live:** tap buy-ins, rebuys, cash-outs and payments as the night goes (like the homegame
    live session screen).
  - **Final totals:** skip straight to entering each player's buy-in and cash-out at the end.
- **Nothing is saved by default.** Settling and closing leaves no record anywhere.
- An optional **Save to my history** at the end. Saved games are a personal record the user can
  open later: players, buy-ins, cash-outs, payments, who pays whom.
- A live one-off survives leaving the screen, locking the phone, refreshing or closing the app, and
  is easy to get back to.

## Non-goals (v1)

- Use without an account. Anyone signed out keeps using the public calculator.
- Users with no homegame. The app shell needs a selected homegame to show the menu at all; this
  feature is for people who have a regular game and are playing elsewhere tonight.
- Counting one-offs in My Stats, leaderboards, badges, the dashboard, or any homegame view.
- Sharing a link to a one-off, or other players seeing it. Sharing is the existing plain-text share.
- Turning a one-off into a homegame later.
- Continuing an in-progress game on another device, or backing it up to the server.
- Editing a saved game. Saved games can be viewed and deleted.

## Anti-goals (would count as failure even if it works)

- Any one-off data appearing in a homegame: its players list, sessions, leaderboard, member stats,
  push notifications, or the homegame switcher.
- One-offs counting toward the 5-homegame limit.
- An unsaved game reaching the server.
- A live one-off being lost because the user tapped away from the screen.

## Approaches considered

**A. Separate one-off store (chosen).** The in-progress game lives only in the browser's storage on
the device. Saving writes one row to a new owner-only table. Homegame tables, queries and RLS are
untouched. Cost: the live session screen is wired directly to the homegame live session context and
needs refactoring so the same UI can run on a local game.

**B. Hidden homegame per saved game** (the original backlog idea: `homegames.is_adhoc`). Saving
would create a hidden homegame, players and a session so the existing session screens display it.
Rejected: the in-progress game must still be local (the existing `live_sessions` table saves to the
server immediately, which breaks "nothing saved by default"), so the main reuse benefit is gone,
and about six places (header switcher, dashboard cards and currency set, My Stats currency set,
the first-homegame fallback in `useAuth`, the 5-homegame count, the `admin_homegames` RPC) would
have to filter hidden homegames forever.

**C. Sessions without a homegame** (`sessions.homegame_id` nullable). Rejected without discussion:
every session query, RLS policy and type assumes a homegame.

The user picked A.

## How it works

### Entry and navigation

- New tile **One-off** in the club menu (`src/components/layout/Header.tsx`, the `ClubTile` grid
  alongside Players and Calculator). Shown to every member, not only owners.
- While a one-off is in progress on this device, the tile reads **Resume game** (with the player
  count).
- The tile opens a new route, `/one-off`:
  - In-progress game at the top, if any, with **Resume** and **Discard** (Discard asks for
    confirmation using the app's existing confirm-dialog pattern).
  - **Start live game** and **Enter final totals**.
  - **Saved games**: newest first, each showing date, optional label and player count. Tapping one
    opens a read-only detail view.
- Bottom navigation (`src/components/layout/Navigation.tsx`): today the centre button becomes a
  pulsing ▶ **Live** button when a homegame live session exists. Extend it: if there is no homegame
  live session but a one-off is in progress on this device, the same pulsing ▶ opens the one-off
  live screen. If both exist, the homegame live session wins the centre button; the one-off stays
  reachable from the menu tile and `/one-off`.

### Starting a game

- Players are typed in by name. They are not homegame players and never touch the `players` table.
- *(Builder-check call:)* names must be non-blank and unique within a game, ignoring case and
  surrounding spaces. This is checked on start, when adding a player mid-game, and on the settle
  screen. Players and payments still refer to each other by id, so renaming a player never breaks
  a payment.
- Optional label (for example "Dan's place") and date (defaults to today).
- Currency defaults to the current homegame's currency and can be changed for this game.
- Live mode also asks for a default buy-in, matching the homegame live session start.
- At least 2 players to start, matching the homegame live session.

### Live mode

Same behaviour as the homegame live session screen (`src/pages/LiveSessionPage.tsx`): quick
buy-in buttons, custom buy-in, undo a buy-in, add a player mid-game, remove a player, cash a player
out (locks their chip count), rejoin, record payments between players, notes, running pot totals.
**End game** goes to the settle screen with everything pre-filled.

### Final totals mode and the settle screen

- One screen for entering or correcting each player's total buy-in and cash-out, plus payments
  already made between players. Live mode lands here pre-filled; final totals mode starts here
  empty.
- Shows who pays whom, taking payments already made into account. *(Builder-check call:)* neither
  existing function fits on its own. `computePublicSettlement` (`src/lib/publicSettlement.ts`)
  takes plain players but ignores payments; `calculateSettlements` (`src/lib/settlement.ts`)
  handles payments but needs homegame player objects. Extract or write one payment-aware helper
  that works on plain `{ id, name, buy_in, cash_out }` players and use it here. With no payments,
  its transfers must match the public calculator for the same numbers. Homegame code keeps using
  `calculateSettlements` unchanged.
- **Totals must balance before anything is settled** (user's decision). While total buy-ins and
  total cash-outs differ by more than 0.01, the settle screen shows how far off it is (for example
  "Cash-outs are $5.00 short") and does not show who pays whom. **Share** and **Save to my
  history** stay unavailable until it balances, the same rule as the homegame session form
  (`SessionForm.tsx`). The user fixes a number and the transfers appear.
- Actions at the bottom:
  - **Share**: the existing plain-text share (as in `SessionCard`), no link.
  - **Save to my history**: writes the game to the server, clears it from the device, opens the
    saved game's detail view.
  - **Done**: clears the game from the device with nothing saved. Asks for confirmation, since
    the game is then gone for good.

### Keeping an in-progress game on the device

- Stored in `localStorage`, one in-progress one-off per user per device, under a versioned key
  that includes the user's id (for example `oneoff:v1:<userId>`).
- Written on every change. Read on app load to drive the menu tile, the `/one-off` screen and the
  centre nav button.
- Removed on **Save to my history**, **Done** or **Discard**.
- Signing out leaves it in place. Another account signing in on the same device doesn't see it;
  the original user sees it again when they sign back in.
- Every read and write is wrapped in try/catch. If storage is unavailable (private window, blocked
  site data), the game still works for the current page lifetime and the screen says it won't
  survive a refresh.
- Player identity inside a game uses locally generated ids (`crypto.randomUUID()`), with the name
  stored alongside.

### Saved games (server)

New table `oneoff_games`:

| column | type | notes |
|---|---|---|
| id | uuid pk | default `gen_random_uuid()` |
| user_id | uuid not null | references `auth.users`, on delete cascade; default `auth.uid()` |
| played_on | date not null | |
| label | text null | |
| currency | text not null | |
| notes | text null | |
| players | jsonb not null | `[{ id, name, buy_in, cash_out }]` (ids from the device game) |
| payments | jsonb not null | `[{ from_id, to_id, amount }]`, default `[]` |
| transfers | jsonb not null | who pays whom at save time: `[{ from_id, to_id, amount }]` |
| created_at | timestamptz not null | default `now()` |

- RLS: the owner can select, insert and delete their own rows. No update policy (no editing in v1).
  No access for anyone else, including homegame owners and the admin RPCs.
- *(Builder-check call:)* who-pays-whom is stored at save time in `transfers` and shown as stored.
  A saved game is a record, so a later change to the settlement math must not quietly change what
  old games say.
- Index on `(user_id, played_on desc)` for the history list.
- Detail view: date, label, currency, notes, each player's buy-in, cash-out and profit, payments
  already made, who pays whom, **Share** and **Delete** (with confirmation).

## Constraints

- The repo is public. Keep to the conventions in the project's public-release notes: the build is
  gated on `tsc`, and the existing lint warnings are deliberately left as they are.
- No new dependencies.
- Migrations are applied to the live project with `supabase db query --linked -f`, not
  `supabase db push`, and only with the user's go-ahead. Regenerate types afterwards
  (`npm run gen:types`).
- Visual design follows `DESIGN_DIRECTION.md` and the existing live session screen (dark, gold
  accent). The one-off screens should feel like the same app, not a separate tool.
- Homegame behaviour must be unchanged: the refactored live session screen must behave exactly as
  it does now for homegame games.

## Left to the builder

- How to split the live session screen so it runs on either data source. A shared interface
  modelled on `LiveSessionContextType` in `src/contexts/LiveSessionContext.tsx` (actions like
  `addBuyIn`, `cashOut`, `addPayment`, `finish`), with a Supabase-backed provider and a local one,
  is the expected shape, but the exact boundary is the builder's call.
- Whether the settle screen reuses `SessionForm` or is a new component.
- Component and route names beyond `/one-off`, and the local storage schema details.
- Test coverage: at minimum the local store (persist, restore, clear, per-user isolation), the RLS
  policies on `oneoff_games`, and a regression check that the homegame live session still works.

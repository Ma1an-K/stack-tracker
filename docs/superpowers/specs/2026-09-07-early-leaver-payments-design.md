# Early-leaver payments in settlements

Date: 2026-09-07

## Problem

Settlements are computed on the fly from each player's buy-in and cash-out
(`src/lib/settlement.ts`). Nothing records money that changed hands during the
game. When a player leaves early and pays their loss in cash to someone still
at the table, the final settlement tells them to pay again and tells the payee
to collect from someone else.

## Goal

Record in-game payments (from, to, amount) on both live sessions and finished
sessions, and have the settlement calculation net them out so only the
remaining transfers are shown. Existing flows, stats, leaderboard, badges,
share text and the public calculator must keep working unchanged.

## Decisions

- Cash-out is locked when a player leaves a live game; the payment is a
  separate fact. A payment may be partial, an overpayment, or absent.
- A payment may go to any player in the session.
- Finished sessions show both "Paid during game" and "Remaining settlements".
- Payments are stored in a new `session_payments` table (foreign keys over
  JSONB; folding into buy-in/cash-out rejected because it corrupts profit stats).
- Final computed settlements are still not persisted. Out of scope.

## Schema

```sql
CREATE TABLE public.session_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  from_player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  to_player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (from_player_id <> to_player_id)
);
CREATE INDEX session_payments_session_id ON public.session_payments(session_id);
-- RLS mirrors session_players: members of the session's homegame can
-- select / insert / update / delete.

ALTER TABLE public.live_sessions
  ADD COLUMN payments JSONB NOT NULL DEFAULT '[]'::jsonb
  CHECK (jsonb_typeof(payments) = 'array');
-- payments: [{ "from_player_id": uuid, "to_player_id": uuid, "amount": number }]
-- players entries gain an optional "cash_out": number (present = player has left).
```

Applied through the Supabase SQL editor (db push is broken for this project),
then `supabase gen types` to refresh `src/integrations/supabase/types.ts`.

## Settlement math

`calculateSettlements(sessionPlayers, payments = [])`:

1. Net per player = buy_in − cash_out (positive owes, negative is owed), as today.
2. For each payment where both players are in the session: payer's net −= amount,
   payee's net += amount. Payments referencing a player not in the session are
   ignored.
3. Run the existing greedy pairing on the adjusted nets.

Overpayment flips a sign and the algorithm routes money back. Profit
(buy_in − cash_out) is unchanged, so stats, leaderboard and badges are
unaffected.

## Types

```ts
interface SessionPayment { id; session_id; from_player_id; to_player_id; amount; created_at }
interface SessionPaymentWithDetails extends SessionPayment { from_player: Player; to_player: Player }
interface LiveSessionPlayer { player_id; buy_in; cash_out?: number }
interface LiveSessionPayment { from_player_id; to_player_id; amount }
SessionWithPlayers gains session_payments: SessionPaymentWithDetails[]
```

## Live session (`LiveSessionPage`, `LiveSessionContext`)

- Each player row gets a "Cash out" action that asks for the chip count, sets
  `cash_out`, marks the row as left (buy-in becomes read-only, rebuy buttons
  hidden). "Rejoin" clears `cash_out`. Cash-out is editable until the session
  ends.
- "Record payment" opens a form with from, to, amount. When launched from a
  cashed-out player's row it defaults from = that player and amount = their
  loss when they lost. Payments list renders below players with delete.
- Context gains `cashOut(playerId, amount)`, `rejoin(playerId)`,
  `addPayment(p)`, `removePayment(index)`, persisted with the same whole-document
  optimistic update as `players`.
- "End Session & Cash Out" navigates to `/new-session?from=live` and passes
  players (with pre-filled cash-outs) and payments.

## Session form (`SessionForm`)

- New "Payments made" section below the player list, in create and edit modes.
  Rows of from / to / amount using players currently in the form. Removing a
  player drops their payments. Validation: from ≠ to, amount > 0.
- `createSession` and `updateSession` accept `payments` and write
  `session_payments` after `session_players` (edit replaces the set, same as
  players).
- Accepts `initialPayments` from the live handoff.

## Session card and loading

- `useSessions` fetches `session_payments` (with from/to players) per session.
  Fetched as a separate query whose failure is swallowed so the UI can be
  previewed locally before the migration is applied.
- `SessionCard` shows "Paid during game" (A paid B $X) when payments exist,
  then "Remaining settlements". When nothing remains, shows "All settled during
  the game". Copy-to-chat text includes both sections.

## Testing

Unit tests for `calculateSettlements`:
- no payments → identical to current output
- full payment removes the leaver from remaining transfers
- partial payment reduces the remaining amount
- overpayment reverses direction
- payment involving a non-session player is ignored
- payment between two players who are both owed money still nets correctly

Manual: live flow with one early leaver through to the finished card, and
create/edit a session with payments via the form.

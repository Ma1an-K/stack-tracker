# Homegame Icon Click & Badge Toggles — Design Spec

**Date:** 2026-04-15

## Overview

Two related owner-only features for homegame configuration:
1. Clicking the homegame icon in the header opens the icon picker.
2. A new "Badges" entry in the gear dropdown lets the owner toggle individual badges on/off for the entire homegame.

---

## Feature 1: Clickable Header Icon

### Behaviour
- The homegame icon `<img>` in `Header.tsx` (top-left) is wrapped in a `<button>` **for owners only**.
- Clicking it calls `setIconPickerOpen(true)`, opening the existing icon picker dialog.
- Non-owners render the plain `<img>` unchanged — no interactivity.
- Visual affordance: `cursor-pointer` + subtle hover ring (e.g. `hover:ring-2 hover:ring-yellow-500/50`) to signal the icon is tappable.

### Files changed
- `src/components/layout/Header.tsx` — conditional button wrapper around icon `<img>`.

---

## Feature 2: Badge Toggles

### Behaviour
- A new **"Badges"** `DropdownMenuItem` is added to the owner section of the gear dropdown in `Header.tsx`.
- Clicking it opens a new `<Dialog>` listing all 9 badge definitions, each with a `Switch` toggle.
- **On** = badge is active (default). **Off** = badge is hidden for all homegame members.
- Each toggle fires immediately — `updateHomegame({ disabled_badges: [...updatedList] })` — no save button.
- The dialog is owner-only (rendered inside the `{isOwner && ...}` block).

### Data model
- New column `disabled_badges TEXT[] DEFAULT '{}'` added to `public.homegames`.
- `Homegame` interface in `src/types/database.ts` gains `disabled_badges: string[] | null`.
- A Supabase migration file adds the column.

### Badge filtering
- `computeHomegameBadges` in `src/lib/badges.ts` receives an optional `disabledBadges: string[]` parameter.
- Any badge whose `id` is in `disabledBadges` is skipped when assigning badges to players.
- All call-sites that invoke `computeHomegameBadges` pass `homegame.disabled_badges ?? []`.

### Files changed
- `supabase/migrations/<timestamp>_add_disabled_badges.sql` — new migration.
- `src/types/database.ts` — add `disabled_badges` field to `Homegame`.
- `src/lib/badges.ts` — accept and apply `disabledBadges` param in `computeHomegameBadges`.
- `src/components/layout/Header.tsx` — new "Badges" dropdown item + badge toggle dialog.
- All call-sites of `computeHomegameBadges` (grep to find them) — pass `disabled_badges`.

---

## Constraints
- Both features are **owner-only**; member-role users see no change.
- No new routes or pages needed.
- Badge toggle state is homegame-wide — applies to all members equally.
- `updateHomegame` already exists and handles partial updates to the `homegames` row.

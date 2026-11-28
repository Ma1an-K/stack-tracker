# Feature tour after first sign-in — design

Status: signed off by the owner 2026-11-28 from the clickable draft `docs/tour-prototype.html`
(published at https://claude.ai/artifact/5DomjzCCjvgVDyYG3gBiA5). The draft is the visual and copy
reference; this document is the authority where they differ.

## Goal

New accounts get a short, optional, swipe-through tour of what the app does, once, the first time
they reach Home. It complements (does not replace) the Getting started checklist, the two one-time
tips and the install prompts that shipped on 2026-11-28.

## Who sees what

The card set depends on the user's situation when the tour opens:

| Situation | Rule | Cards |
|---|---|---|
| Host | current homegame role is `owner` or `admin` | 4: Log every game · Settle up in seconds · Standings and badges · Run your homegame |
| Member | current homegame role is `member` | 4: Log every game · Settle up in seconds · Standings and badges · Your own stats |
| No homegame | no current homegame | 3: Log any game · Settle up in seconds · Same crew every week? |

Copy, illustration and "Where" line for each card are exactly as in the draft's `CARDS` table
(member stats card: "Your results across every game and homegame, once your host confirms which
player is you. The sidepot calculator is in the menu too."). The sidepot calculator stays a mention
on the member stats card; it does not get its own card (owner decision).

## When it shows

- Automatically **once**, on the first render of Home (`/`) for an eligible account, once auth data
  has loaded (never during the splash or the `userDataPending` window).
- **Eligible** = the profile was created on or after `TOUR_RELEASE` (a date constant, set to the
  deploy date, same pattern as `ONBOARDING_CUTOFF`) **and** `'tour'` is not in `profile.seen_tips`.
  Using the account's creation date means existing accounts never see it automatically and no
  migration or back-fill is needed. A profile without `seen_tips` (column missing) is not eligible.
- Not during a live game (the Home screen shows the live game then; skip auto-open while a live
  session exists for the current homegame).
- **Skip, the scrim, Escape and finishing** ("Let's play" on the last card) all close it and record
  `'tour'` in `profile.seen_tips` via the existing `useTips().markSeen` path, so it never returns on
  any device.
- **Replay:** a "Take the tour" row in the header menu opens it on demand for anyone (old or new
  account, any situation). Replaying writes `'tour'` too (harmless if already there).

## Install sheet ordering

The "Keep it one tap away" install sheet must never open while the tour is open. If the install
sheet would open (a queued `pendingSheet` on arrival, or `firstSuccess`) while the tour is open, it
waits and opens after the tour closes (subject to the existing snooze rules at that moment). The
Home install banner stays hidden while the tour is open.

## Presentation

- Bottom sheet over Home (reuse the app's existing sheet/drawer primitive used by InstallSheet),
  with: "N of M" counter and Skip at the top; a horizontally swipeable track of cards (CSS
  scroll-snap); dots; a full-width primary button reading "Next", or "Let's play" on the last card.
- Each card: a small drawn illustration built from app tokens (no images, no third-party artwork),
  a Fraunces title, a muted body line, and a "Where" line.
- Phone-first at 375px and 360px; tap targets ≥ 44px; respects `prefers-reduced-motion`
  (no smooth scroll, no sheet slide); dialog semantics with a label, focus moved into the sheet and
  returned on close; swiping and the Next button stay in sync with the counter and dots.

## Out of scope

- Changing the checklist, tips or install rules beyond the ordering above.
- Analytics on tour completion.
- Translations.

## Owner deploy steps

- Set `TOUR_RELEASE` to the deploy date before shipping (accounts created earlier never auto-see it).
- No database migration.

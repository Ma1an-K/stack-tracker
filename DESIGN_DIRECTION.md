# Stack Tracker — Variant C design direction: "Private Salon"

Design authority: **UI UX Pro Max** (`.claude/skills/ui-ux-pro-max`, local search scripts only, run offline with `python3`).
Branch `redesign/c-ui-ux-pro-max`. UI layer only: no Supabase calls, hooks, types, routes or auth logic changed.

## 1. Concept

A members-only card room at 1 a.m.: warm onyx surfaces like lacquered wood, champagne-gold
hairlines, ivory type and one editorial serif for the moments that matter (page titles, the
big profit figure, the auth hero). Everything else is quiet, fast and thumb-reachable. The
luxury comes from restraint and craft (consistent tokens, embossed cards, glass chrome,
gentle motion), not ornament. Functionally it is a **ledger you can run one-handed
mid-game**: the live table is always one tap away, the result of a session is shown the
moment it is logged, and every sheet rises from the bottom where the thumb already is.

## 2. What the skill said, and what I took from it

Queries run (all `python3 .claude/skills/ui-ux-pro-max/scripts/search.py …`):

| Query | Result (top match) | Taken / rejected |
|---|---|---|
| `"luxury poker home game ledger mobile app dark premium" --design-system -p "Stack Tracker"` | Style **Liquid Glass**; palette "Premium black + gold accent" (light mode, `#1C1917` / `#A16207`); type **Cormorant + Montserrat**; anti-patterns "cheap visuals", "fast animations" | **Took** Liquid Glass for app *chrome only* (header, bottom bar, sheets: translucent + blur), the warm stone/onyx family instead of the old navy, Cormorant as display face. **Rejected** the light background (app is used in dim rooms, existing brand is dark) and the scroll-storytelling landing pattern for the app shell |
| `"personal finance ledger tracker dark mode" --design-system --density 6 --motion 3 --variance 3` | Minimalism & Swiss; "Trust blue + profit green on dark"; Caveat + Quicksand; subtle scroll-reveal 300–400 ms, y-offset 8–16 px | **Took** the dial outcome: low variance (centred, calm), subtle motion, standard density; small y-offset fades. **Rejected** the blue palette and the handwritten fonts (off-brand) |
| `"casino gaming luxury dark" --domain product` | Luxury/Premium: "Black + Gold + minimal accent", Liquid Glass + Glassmorphism | Confirms one restrained metallic accent |
| `"luxury elegant serif numbers" --domain typography` | Cormorant/Montserrat, Playfair/Inter, Cinzel/Josefin, Bodoni/Jost | **Cormorant Garamond** display + **Inter** UI/figures. Montserrat rejected: its wide set loses ~12 % horizontal room in 390 px ledger rows and its figures are not as tabular-friendly as Inter's `tnum` |
| `"black gold luxury dark" --domain color` | Luxury: stone `#1C1917`/`#0C0A09`, accent `#A16207`; Auction "dark luxury" | Warm stone neutrals adopted as the dark ramp; gold lifted to `#D0A44E` for ≥4.5:1 on dark |
| `"dark luxury OLED premium" --domain style` | Dark Mode (OLED): near-black, minimal glow, text contrast 7:1+ | Near-black onyx bg, glow used sparingly as *state* only |
| `--domain ux`: "bottom navigation mobile", "bottom sheet modal mobile", "skeleton loading state", "touch target size", "page transition navigation", "empty state", "safe area notch", "reduced motion animation duration" | Back button must stay predictable; fixed nav must not obscure content; modal focus trap/return; loading must not flash for near-instant work and must reserve space; 44 pt targets; active-state indication; empty states need a message **and** an action; reduced motion; shared motion tokens | All applied: see §6/§7. "Don't flash for near-instant work" drove the stale-while-revalidate cache instead of spinners |
| `"line chart profit trend" --domain chart` | Line/area chart, fill ~20 %, never hue-only, Recharts OK | Profit chart restyled as gold area line with 20 % gradient fill, dashed zero line |
| `"bottom sheet drawer dialog mobile" --stack shadcn` / `--stack html-tailwind` / `--stack react` | shadcn: let Dialog/Sheet manage focus; RN/Tailwind: predictable back that preserves state; React: `lazy()` routes | Kept Radix Dialog (focus mgmt for free) but restyled it as a bottom sheet below `sm`; Back buttons fall back to a real route when there is no history; protected routes code-split with `lazy()` |
| `"rerender memo list" --domain react` | Narrow deps, memoised components | Followed in the new cache hook (primitive keys) |
| `references/pro-rules.md` | Canonical pre-delivery checklist | Run in §10 |

## 3. Palette — "Onyx & Champagne" (HSL tokens in `src/index.css`)

| Token | HSL | Hex | Role |
|---|---|---|---|
| `--background` | 24 10% 4% | `#0b0a09` | page (warm onyx, also `html/body`, manifest, theme-color) |
| `--card` | 24 8% 7.5% | `#151312` | surfaces |
| `--popover` | 24 9% 8.5% | | sheets, menus |
| `--secondary` | 24 7% 13% | `#23211f` | secondary buttons, chips |
| `--muted` | 24 7% 10% | | wells, inputs |
| `--input` | 24 8% 10% | | input fill |
| `--foreground` | 38 30% 92% | `#f1ece4` | ivory text (15.8:1 on card) |
| `--muted-foreground` | 32 10% 63% | `#aaa197` | secondary text (7.3:1 on card; old was ~3.9:1) |
| `--primary` = `--gold` = `--ring` | 40 58% 56% | `#d0a44e` | the single metallic accent (8.1:1 on card) |
| `--gold-bright` | 43 75% 70% | | top stop of gold gradient / highlights |
| `--gold-muted` | 36 38% 34% | | gold hairline emphasis |
| `--border` | 36 22% 17% | `#352d22` | brass hairlines |
| `--success` (profit) | 150 50% 50% | `#40bf80` | profit (7.9:1) |
| `--destructive` (loss) | 2 66% 62% | | loss / danger (≥4.5:1 on card and secondary) |
| `--chart-1..5` | gold, ivory-grey ramp | | charts |

One source of truth for money colour: `.profit`/`.loss` now map to `--success`/`--destructive`;
Tailwind `green-*`/`red-*`/`amber-*`/`yellow-*` and dead `dark:` variants removed from app screens.

## 4. Type

- **Cormorant Garamond** 500/600/700 (display: page titles, hero figures, auth/landing headlines, empty-state titles). Lining numerals via `font-variant-numeric: lining-nums`.
- **Inter** 400/500/600/700 (UI, body, all figures with `tabular-nums`).
- Loaded with `<link rel="preconnect">` + one `<link rel="stylesheet">` in `index.html` (Google Fonts, `display=swap`), replacing the two render-blocking CSS `@import`s and dropping Playfair (CSP-compatible: fonts.googleapis.com / fonts.gstatic.com).
- Scale (mobile): display-xl 40/44 (auth, landing hero), page title 30/34 serif, section title 13 px uppercase Inter 600 tracking 0.14em gold, body 15/22, small 13/18, micro 11/14 (minimum; no more 9–10 px text). Hero figure 44 px serif lining tabular.

## 5. Space, radius, elevation, chrome

- 4/8 rhythm. Page gutter 16 px (safe-area aware), section gap 24 px, card padding 16–20 px.
- Radius: `--radius` 14 px (cards 14, controls 12, chips/pills full, sheets 24 top corners).
- Elevation: kept the embossed card (1 px gold ring + deep drop + 1 px inset top highlight) but moved it into an explicit `.surface` utility and the shadcn `Card`, instead of the implicit `.rounded-lg.border` selector side-effect (selector kept as a fallback so nothing un-styled regresses).
- Glass chrome (Liquid Glass, chrome only): header and bottom bar are `bg-background/72` + `backdrop-blur-xl saturate-150` + brass hairline; sheets are solid popover with a top grabber. Content surfaces stay opaque for legibility.
- Ambient light: the two radial gold glows are kept, softened, and live in the persistent shell (no remount).

## 6. Components

- **Button**: 44 px default height (48 px `lg`, 40 px `sm`, icon 44×44), gold gradient primary with inner highlight, pressed state `active:scale-[0.98]` + brightness (transform/opacity only), visible gold focus ring.
- **Inputs**: 48 px, filled `--input`, 16 px text (prevents iOS zoom), gold focus ring.
- **Dialog / AlertDialog → bottom sheet on mobile**: below `sm` every Radix dialog docks to the bottom, full width, 24 px top radius, grabber, safe-area bottom padding, slides up 260 ms; ≥ `sm` it stays a centred card. One change in `ui/dialog.tsx` + `ui/alert-dialog.tsx` converts all 15+ dialogs (cash-out, rebuy, payment, edit session…), which also keeps auto-focused inputs above the iOS keyboard.
- **Toasts**: top-centre under the safe area (`env(safe-area-inset-top)`), glass card, swipe to dismiss.
- **Page header** (`PageHeader`): serif title + optional subtitle + right-aligned action; one component used on every screen (fixes title drift).
- **Empty state** (`EmptyState`): icon medallion, serif title, one line, one primary action (fixes wrong "New Session tab" copy).
- **Skeletons**: shape-matched skeletons per page, shimmer disabled under reduced motion.
- **Session card**: whole header row is the toggle (button, `aria-expanded`), 44 px actions, primary actions (Share, Settled) visible as a footer bar when expanded.

## 7. Motion

Tokens: `--dur-fast 120ms` (press), `--dur-base 200ms` (page enter, fades), `--dur-sheet 260ms` (sheet in; exit 180 ms — exit faster than enter), easing `cubic-bezier(0.22, 1, 0.36, 1)`.
- Route enter: 200 ms opacity + 8 px rise on the page container only (no exit animation, so navigation is never delayed).
- Sheets slide from bottom; menus fade/zoom 150 ms.
- Press feedback on every button/tab (scale 0.97, 120 ms).
- Live pulse kept, as state not decoration.
- `prefers-reduced-motion: reduce` collapses all animation/transition durations to ~0 and disables shimmer/pulse.

## 8. How it keeps (and raises) the luxury feel

Single metallic accent on warm near-black; brass hairlines; embossed cards; ambient glow;
glow-as-state on the active tab and live button; ledger typography (uppercase tracked section
labels, tabular figures, gold top-3 ranks) — all kept from the audit's list. Added: an
editorial serif for titles and hero figures, glass chrome, gold gradient buttons with an inner
highlight, a coherent type scale, and much better text contrast (muted text 7:1).

## 9. UX / navigation changes (each tied to an audit pain point)

| Change | Pain point |
|---|---|
| **One persistent shell**: a single layout route (`AppShell`) renders Header, Navigation, `LiveSessionProvider` and glows once, with pages in an `<Outlet>`; `/` uses the same shell when signed in with a homegame | #2 shell remount, FAB flicker, Resume strip flashing |
| **Stale-while-revalidate page cache** (`useCachedValue`): pages remember the last data they rendered (in memory, keyed by homegame) and show it instantly on revisit while the existing hook refetches exactly as before; shape-matched skeletons only on a true first load | #1 spinner on every tab switch, #4 feels like reloads, #28 stale-game flash (cache keyed by homegame id) |
| **Scroll to top on route change** inside `<main>` (preserved on back/forward via a per-path scroll map) | #3 scroll leaks |
| **Route enter transition** (200 ms fade/rise) | #4 hard cuts |
| **Log session → land on Sessions with the new session expanded** (`navigate('/sessions', { state: { expandLatest: true } })`) | #5 settlement 2 taps away |
| **Whole session card header is the toggle**, actions in a visible footer | #6 32 px chevron |
| **Bottom bar = Home · Sessions · ● · Standings · Stats** (5 slots; skill rule "bottom nav ≤ 5"), 56 px row + `env(safe-area-inset-bottom)`, glass, no fake rounded corners in browsers. Players and Calculator move to the header (Players icon button with `tutorial-nav-players`) and to Home quick actions | #23 nav sizing, skill nav-limit; tutorial ids kept |
| **Centre button**: `+` → New Session; while live it becomes a labelled gold "LIVE" ▶ and the shell never remounts so it can't flash `+` | #2, #7 |
| **New Session gets a segmented "Live game / Log result" switch at the top**; Home gets a primary "Start live game" card that goes straight to `/live-session` | #7 live buried |
| **Live tracker**: labelled `+50`/`+100`/`Other`, labelled `−` and `Cash out`, 44 px targets, Add Player always visible (disabled with a hint when the bench is empty), buy-in shows an edit affordance, Back goes to `/` when there's no history | #8 (aligns with draft spec in `docs/superpowers/specs/2026-11-23-live-buyins…`) |
| **Club sheet** replaces the gear dropdown (bottom sheet with large rows: Players, Calculator, Members, Invites, Icon, Badges, Notifications, Profile, Sign out, Delete); gear button 44 px with aria-label; homegame switcher also becomes a sheet | #9 hidden admin, #24 small targets |
| **Invite: Share button** (Web Share API, copy fallback) with a pre-written message, plus labelled Copy; owner "Invite" quick action on Home | #10 copy-only |
| **Auth page rebuilt on Tailwind tokens** (same logic, same steps), real `<button>`s for "Reset it"/"Back to sign in"; `/auth?mode=signup` opens Create Account (landing CTAs pass it) | #11 (one tap), #18 two design systems |
| **Dashboard tappables honest**: homegame cards say "Switch"/"Current" and recent sessions link to `/sessions`; shortcut tiles to Sessions, Standings, Players, Calculator | #12 |
| **Empty states with actions and correct copy** | #13 |
| **Session form**: sticky bottom "Log session" bar with a live balance status line explaining why it's disabled; currency symbol from the homegame | #14, #15 (display only) |
| **Toasts under the safe area** | #22 |
| **Dialogs → bottom sheets** | #21 |
| **44 px targets** for trash, chevron, settings, role buttons, "Mark sent" | #24 |
| **Mark sent/received labelled "Saved on this device"** | #27 |
| **Members/Invites/Leaderboard headers normalised** via `PageHeader`; Invites double padding removed | #20 |
| **Protected routes lazy-loaded** (public prerendered pages stay eager for hydration) | #29 bundle size |
| **NotFound** styled, uses `<Link>` | 404 |

## 10. Assumptions

- Owner wants dark only (no light theme) — existing app is dark-only and used in dim rooms.
- Players page is used far less often mid-game than Stats, so it moves out of the bottom bar into the header (always visible, so the tours still spotlight it).
- Keeping the last-rendered data in memory for the session (not persisted) is acceptable "UI-layer caching": hooks still fetch on every mount exactly as before.
- `?mode=signup` on `/auth` only chooses which already-existing step the page opens on; it does not change auth logic.
- Navigating to `/sessions` after logging (instead of `/`) is a UX change of *where the user lands*, not of what the route does.

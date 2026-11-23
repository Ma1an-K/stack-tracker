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

- **Fraunces** (variable, optical sizing on), rendered at 500 (display: page titles, hero figures, auth/landing headlines, empty-state titles). Replaced Cormorant Garamond on 2026-11-23 after owner feedback: the Google Fonts build of Cormorant has no lining-figure feature, so `lining-nums` was ignored and money figures rendered in old-style numerals ("4860" with rising/falling digits). Fraunces figures are lining by default.
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

## 11. Pre-delivery checklist (skill `references/pro-rules.md`), as applied

| Item | Status |
|---|---|
| No emoji as structural icons | Lucide only in UI chrome; removed the emoji from tour title/controls. Share *messages* keep their emoji (content, not UI). Badge dialog keeps an emoji fallback only when art is missing |
| One icon family / stroke | Lucide throughout; active tab uses a heavier stroke as state |
| Pressed feedback, no layout shift | `active:scale-[0.97]`/`.pressable` (transform only) on buttons, tabs, chips, cards |
| Touch targets ≥ 44 px | Buttons 44/48 px, icon buttons 44×44, inputs 48 px, tab items 48 px, name chips 44 px, select/dropdown items 44 px; card picker cells ~80×40 on phones; small visual close dots get expanded hit areas |
| Semantic tokens, no ad-hoc hex | Tailwind `green/red/amber/yellow-*` and the `rgba(200,155,60,…)` / `rgb(10,13,24)` literals replaced by tokens in app and marketing pages (playing-card face colour and the landing phone mock-up are the deliberate exceptions) |
| Disabled states | `disabled:opacity-45` + no pointer events; the session form's disabled Log button now has a live status line saying why |
| Labels for icon controls | Header buttons, tab bar, session toggle (`aria-expanded`), trash/remove/role buttons, card remove, toast close all labelled |
| Dark contrast ≥ 4.5:1 | ivory 15.8:1, muted 7.3:1, gold 8.1:1, profit 7.9:1, loss ≥ 4.5:1 on card/secondary (computed, §3) |
| Scrim legibility | Overlay `bg-black/70` + 2 px blur under every sheet |
| Safe areas | Header `env(safe-area-inset-top)`, tab bar + sheets + sticky bars `env(safe-area-inset-bottom)`, side insets on header/main/tab bar, toasts below the notch |
| Content not hidden behind fixed bars | `<main>` padding accounts for header and tab bar; sticky action bars sit inside that padding (verified in headless Chrome that sticky offsets respect scroll-container padding) |
| Reduced motion | Global `prefers-reduced-motion` collapse; shimmer, pings and page-enter all neutralised |
| Form labels / errors | Every field has a visible label; balance errors shown inline near the submit button (existing toasts kept as a second channel) |
| Password managers / paste | Auth inputs use real `autocomplete` values, no paste blocking |
| Not verified in a browser | Per the brief the app was not run against the live backend; 375 px / landscape / largest-text checks are left to the orchestrator's screenshot harness |

## 12. Tap counts after

Same rules as the audit (start on signed-in Home, owner, homegame selected; 1 tap = a press or focusing an input; typing, keyboard Next/Done and scrolling are free; autofocus costs 0; N = players, M = players still seated). Where the audit's own step list and total disagreed I re-added the steps and show both.

| # | Flow | After (steps) | Before → After |
|---|---|---|---|
| 1 | Log a finished session (manual) | Home **Log a result** or **+** (1) → each chip (N) **or Add everyone (1)** → focus first Buy-in (1), keyboard Next walks buy-in → cash-out → next row → **Log session** (1) | 3N+2 = **20** → N+3 = **9**, or **4** with Add everyone (strict per-field count without Next: 3N+2, unchanged) |
| 1b | …then see who owes whom | Lands on Sessions with the new session already expanded | **+2 → 0** |
| 2 | Start a live game | Home **Start live game** (1) → (optional preset buy-in, 1) → chips (N) **or Everyone (1)** → **Start session** (1) | steps add to N+3 = 9 (audit total says 8) → N+2 = **8**, or **3** with Everyone; custom buy-in +1 via preset instead of focus+type |
| 2a | Live rebuy (standard) | Resume strip / ▶ (1) → **+50** (1) | 2 → **2** (1 on screen), now 44 px labelled buttons |
| 2b | Live rebuy (custom) | ▶ (1) → Other or tap the buy-in figure (1) → type (autofocus) → Add to buy-in (1) | 3 → **3** |
| 2c | Late arrival (existing player) | ▶ (1) → Add player, always visible (1) → name chip (1) | 3 → **3** (no longer hidden; empty bench explains and links to Players) |
| 2d | Player leaves early and pays | ▶ (1) → **Cash out Name** (1) → type (autofocus) → Cash out (1) → payment sheet auto-opens prefilled → **To** chip (1) → Save (1) | 6 → **5** (chips replace the To select) |
| 2e | End live game | ▶ (1) → End session & cash out (1) → focus first remaining cash-out (1) + Next → Log session (1) | M+3 = **9** → **4** with Next (M+3 strict) and lands on the result |
| 3 | View a session's settlements | Sessions (1) → tap anywhere on the card header (1) | 2 → **2** (target 32 px → full-width 72 px row); **0** right after logging |
| 3a | Mark settled / Share / Edit | flow 3 + 1 | 3 → **3** (actions in a visible 2-column footer, settle shows progress) |
| 4 | Check leaderboard | Standings (1); time frame +1; head-to-head row +1 | 1 → **1** |
| 5 | Check my stats | Stats (1), or tap the lifetime hero on Home (1) | 1 → **1** (Mark sent is 44 px) |
| 6 | Switch homegame | Header name (1) → pick in sheet (1); or tap another homegame card on Home (1) | 2 → **2** (1 via Home), cards now say Current/Switch |
| 7 | Create invite (owner) | Home **Invite** (1) → Create invite code (1) → **Share invite** (1) → pick chat app in the OS sheet | 4 + manual paste → **3** + OS share (pre-written message). Via Club: 4 |
| 8 | Join another game | Header name (1) → Join with code (1) → (autofocused) type → Join (1) | 4 → **3** |
| 9 | Sidepot / hand calculator | Club (1) → Calculator (1) [members: Home Calc shortcut (1)] → hole/board cards 2 taps each (18) → 2 stacks (2) | ≈21 → **≈22 owners / ≈21 members**; each card target ~26×34 → ~80×40 px. Regression of 1 tap for owners (Calc left the tab bar) |
| 10 | New owner onboarding | Get started (1) → opens on Create account (0) → 3 fields (3) → Create (1) → email round trip → link lands on Landing with a **Continue** banner (1) → setup, game name autofocused → Create game (1) → tour | 9 → **7** + email (+ tour) |
| 10b | New player with code | as 10 but setup: Join with code (1) → focus code (1) → Join (1) | 10 → **9** + email |
| 11 | Sign in (returning) | focus email (1) + password (1) → Sign in (1); after sign-up the email is prefilled | 3 → **3** (2 right after sign-up) |
| 12 | Notifications / Edit profile | Club (1) → row/tile (1) | 2 → **2** |

## 13. Known gaps / things that felt forced

- **Players and Calculator left the tab bar** to respect the skill's "bottom nav ≤ 5". Players sits in the header (so the tours can still spotlight it); Calculator is one extra tap for owners (Club sheet), members get it on Home. If the owner uses the calculator mid-hand a lot, swapping Stats for Calc would be the alternative.
- **Stale-while-revalidate is in-memory only** (per tab, cleared on reload) and keyed by homegame; first visit to each tab after launch still shows a skeleton. Route chunks are prefetched on idle so code is never the wait.
- **"Expand the session just logged"** relies on `createSession` returning the new row (it does today); if it didn't, it falls back to expanding the newest-dated card.
- **Session Edit/Delete/Mark settled are still shown to every member** (audit #26): hiding them would change who can do what, which is a permission decision, not a UI one.
- **"Mark sent" is still device-local** (#27); the UI now says so but cannot sync it without a backend change.
- **Creating a brand-new player from inside the live game** (draft spec) needs `addPlayer` + seat in one step; I kept the live screen to its existing context and link to Players instead.
- **Invite share message links to `/auth?mode=signup`** and asks the player to type the code; real deep-link join (`?code=`) would need AuthPage to call `joinHomegame` automatically, which is auth flow logic.
- **iOS keyboard handling** uses a `visualViewport` inset for sheets; behaviour on very old iOS versions without `visualViewport` falls back to the previous (sheet may sit under the keyboard).
- **Light mode** was deliberately not built (dark-only product); the skill's light-mode checklist rows don't apply.
- **Montserrat** (the skill's body pick) was swapped for Inter for density and figure legibility; recorded in §2.
- Not run in a browser against data (brief rule); visual QA happens in the orchestrator's mocked harness.

## 14. UI UX Pro Max full rule pass (240 rules)

Every rule in `.claude/skills/ui-ux-pro-max/references/quick-reference.md` checked against the whole app (all pages, shell, sessions, standings, players, calculator, auth, badges, public pages, 404). The brief said ~141 rules; the installed reference lists **240** across the same 10 categories, so all 240 are covered. Detail looked up with `search.py … --domain ux` where needed. File:line refs are to `src/` at the time of the pass.

**Summary: 240 rules: 152 PASS · 54 FIXED · 19 N/A · 15 DEFERRED.**


### 1. Accessibility (CRITICAL)

| Rule | Status | Where / what |
|---|---|---|
| `color-contrast` | FIXED | Landing body/footer text 30–45 % → 60 % ivory (2.4–4.0 → 6.3:1) `pages/LandingPage.tsx:330`; header discriminator `components/layout/Header.tsx:175`; input placeholder `components/ui/input.tsx:11`; H2H ticks `components/leaderboard/H2HChart.tsx:47` |
| `focus-states` | FIXED | Zero-specificity `:focus-visible` outline fallback `index.css:120`; rings added to session toggle `components/sessions/SessionCard.tsx:124`, Home recent rows, Club rows, public calculator fields |
| `alt-text` | PASS | Logos/badges/icons named; decorative homegame art `alt=""` next to visible names |
| `aria-labels` | FIXED | All `size=icon` buttons were labelled; added: marketing menu `aria-expanded/controls` `components/layout/MarketingNavbar.tsx:110`, badge chips `components/badges/PlayerBadges.tsx:55`, password toggle, calculator remove buttons |
| `icon-context` | PASS | Decorative Lucide icons beside text are `aria-hidden`; icon-only controls named; Settled pill has icon + text |
| `keyboard-nav` | FIXED | Standings rows no longer nest badge buttons inside `role=button` (stretched button) `components/leaderboard/Leaderboard.tsx:86`; tour operable by keyboard |
| `form-labels` | FIXED | Calculator name/stack/all-in now labelled `components/calculator/PlayerInput.tsx:108` |
| `skip-links` | FIXED | Skip link in app shell `components/layout/MainLayout.tsx:68` and marketing navbar `components/layout/MarketingNavbar.tsx:55`; style `index.css:208` |
| `heading-hierarchy` | FIXED | h1→h3 skips fixed: Members `pages/MembersPage.tsx:53`, calculator `components/calculator/PlayerInput.tsx:174`, badge gallery |
| `color-not-only` | FIXED | Inactive players announced, not only struck-through/greyed `components/players/PlayerList.tsx:135`; money always signed (+/−) |
| `dynamic-type` | PASS | rem-based type scale, wrapping layouts; `text-size-adjust:100%` stops iOS landscape inflation without blocking user zoom |
| `reduced-motion` | FIXED | Global collapse existed; chart entrance animations now off too `components/stats/ProfitChart.tsx:88` |
| `voiceover-sr` | FIXED | Chart summaries (`role=img` + label) `components/stats/ProfitChart.tsx:39`; claim button keeps a name while sending |
| `escape-routes` | FIXED | Escape now closes the tour `components/tutorial/TutorialOverlay.tsx:69` and marketing menu; dialogs/back already had them |
| `keyboard-shortcuts` | PASS | No system shortcuts overridden; only author drag is the sheet grabber, which has a Close button |
| `focus-not-obscured` | FIXED | `#main` scroll-padding clears fixed header and sticky Log bar `index.css:310` |
| `focus-not-obscured-enhanced` | FIXED | Same scroll-padding keeps whole focused field visible |
| `focus-appearance` | PASS | 2 px gold ring (8:1 vs onyx) with 2 px offset |
| `dragging-alternative` | PASS | Sheet swipe has the Close button / Escape / scrim tap |
| `web-target-size` | FIXED | Badge chips get extended hit area `components/badges/PlayerBadges.tsx:56`; empty card slot `components/calculator/CardDisplay.tsx:188` |
| `consistent-help` | PASS | Help = tour + Club sheet, always in the same place |
| `redundant-entry` | PASS | Email prefilled after sign-up; live game seeds the session form |
| `accessible-authentication` | PASS | Paste allowed, real autocomplete tokens, no cognitive tests |
| `auto-rotation-controls` | N/A | No carousels or auto-advancing content; live pulse is state and stops under reduced motion |
| `contextual-live-badge-updates` | PASS | Session form balance line is one `role=status` phrase; offline banner is a polite status region |

### 2. Touch & Interaction (CRITICAL)

| Rule | Status | Where / what |
|---|---|---|
| `touch-target-size` | FIXED | Marketing menu 40→44 px `components/layout/MarketingNavbar.tsx:108`; calculator inputs 32→44 px; public calculator fields/remove 36→44 px `components/calculator/PublicSettlementCalculator.tsx:148`; tour close 16→40 px |
| `touch-spacing` | PASS | 8 px gaps on chips/buttons; exception: calculator card slots (4 px, dense card row) with extended hit areas |
| `hover-vs-tap` | PASS | No hover-only reveals |
| `loading-buttons` | PASS | Async buttons disable + spinner |
| `error-feedback` | FIXED | Auth errors next to the field `components/auth/AuthPage.tsx:70` |
| `cursor-pointer` | PASS | Preflight sets pointer on buttons; stretched rows `cursor-pointer` |
| `gesture-conflicts` | PASS | Vertical scroll only |
| `tap-delay` | PASS | `touch-action: manipulation` on buttons/links |
| `standard-gestures` | PASS | No redefined gestures |
| `system-gestures` | PASS | Sheet drag only from the grabber strip, not screen edges |
| `press-feedback` | PASS | `.pressable` scale 0.97 / Button `active:scale` |
| `haptic-feedback` | DEFERRED | Vibration API is unsupported on iOS Safari (the main client); adding haptics is a product decision |
| `gesture-alternative` | PASS | Every gesture has a visible control |
| `safe-area-awareness` | PASS | Header, tab bar, sheets, toasts, skip link use safe-area insets |
| `no-precision-required` | FIXED | Card slot and badge hit areas extended (see web-target-size) |
| `swipe-clarity` | FIXED | The sheet grabber now actually drags `components/ui/dialog.tsx:102` |
| `drag-threshold` | FIXED | 8 px threshold before the sheet follows `components/ui/dialog.tsx:56` |

### 3. Performance (HIGH)

| Rule | Status | Where / what |
|---|---|---|
| `image-optimization` | DEFERRED | Landing art is WebP; app/badge icons are small PNGs. Re-encoding the badge/icon asset set is an asset-pipeline task |
| `image-dimension` | FIXED | Marketing logo declares size `components/layout/MarketingNavbar.tsx:61`; other images have fixed CSS boxes |
| `font-loading` | PASS | Google Fonts `display=swap` |
| `font-preload` | PASS | Preconnect only, one stylesheet |
| `critical-css` | PASS | Single early stylesheet; public pages prerendered |
| `lazy-loading` | PASS | Signed-in routes `lazy()`; now wrapped in an error boundary |
| `bundle-splitting` | PASS | Route-level chunks + idle prefetch |
| `third-party-scripts` | PASS | None |
| `reduce-reflows` | PASS | Sheet drag writes `transform` only, no layout reads in the move loop |
| `content-jumping` | PASS | Shape-matched skeletons |
| `lazy-load-below-fold` | PASS | Below-fold landing images `loading=lazy` |
| `virtualize-lists` | DEFERRED | Sessions list can pass 50 rows after a few years; needs pagination/virtualisation (data hook returns all rows, or a new dependency) |
| `main-thread-budget` | PASS | No heavy synchronous work on interaction |
| `progressive-loading` | PASS | Skeletons + stale-while-revalidate |
| `input-latency` | PASS | Optimistic live mutations |
| `tap-feedback-speed` | PASS | 120 ms press token |
| `debounce-throttle` | PASS | Passive scroll listener; no per-keystroke work |
| `offline-support` | FIXED | Offline banner in the shell `components/layout/MainLayout.tsx:78` |
| `network-fallback` | PASS | Remembered page data stays readable on a slow refetch |

### 4. Style Selection (HIGH)

| Rule | Status | Where / what |
|---|---|---|
| `style-match` | PASS | Private Salon: Liquid Glass chrome, onyx + champagne (§1–2) |
| `consistency` | PASS | One token set, PageHeader/EmptyState everywhere |
| `no-emoji-icons` | PASS | Lucide only; emoji only as badge-art fallback content |
| `color-palette-from-product` | PASS | From `--domain color` luxury query (§2) |
| `effects-match-style` | PASS | Glass on chrome only, embossed cards |
| `platform-adaptive` | PASS | Bottom sheets/tab bar on mobile, centred dialogs + sidebar on desktop |
| `state-clarity` | PASS | Hover/pressed/disabled/selected distinct (aria-pressed chips) |
| `elevation-consistent` | PASS | `.surface` + one sheet shadow |
| `dark-mode-pairing` | N/A | Dark-only product by decision (§10) |
| `icon-style-consistent` | PASS | Lucide, one stroke family |
| `system-controls` | PASS | Native date/number/select inputs, Radix primitives |
| `blur-purpose` | PASS | Scrim blur behind sheets; chrome glass is the chosen style |
| `primary-action` | PASS | One gold primary per screen |

### 5. Layout & Responsive (HIGH)

| Rule | Status | Where / what |
|---|---|---|
| `viewport-meta` | PASS | `width=device-width, initial-scale=1`, zoom not disabled |
| `mobile-first` | PASS | Base styles are mobile; sm/md add |
| `breakpoint-consistency` | PASS | Tailwind sm/md/lg + two micro breakpoints (400/420 px) for row density |
| `readable-font-size` | FIXED | Calculator name input no longer 14 px on phones (iOS zoom) `components/calculator/PlayerInput.tsx:65`; public currency select 16 px. Body copy stays 15 px by type-scale decision (§4); inputs are 16 px |
| `line-length-control` | PASS | max-w-3xl content, max-w-xs descriptions |
| `horizontal-scroll` | PASS | Verified at 390 px in the harness |
| `spacing-scale` | PASS | 4/8 rhythm |
| `touch-density` | PASS | 44–60 px rows |
| `container-width` | PASS | max-w-3xl app (5xl calculator), 1280 px marketing |
| `z-index-management` | PASS | Scale 0/1/10/20/40/50/100/200 (content, chrome, sheets, toasts, tour/skip link) |
| `fixed-element-offset` | PASS | `<main>` pads for header + tab bar |
| `scroll-behavior` | PASS | One scroll container; sheets `overscroll-contain` |
| `viewport-units` | FIXED | `min-h-screen` → `min-h-dvh` `pages/Index.tsx:12`, badge gallery |
| `orientation-support` | PASS | Layouts reflow; text-size-adjust prevents landscape text inflation |
| `content-priority` | PASS | Live game and lifetime figure first on Home |
| `visual-hierarchy` | PASS | Size/weight/serif, not colour alone |
| `compact-label-overflow` | FIXED | H2H legend names expose full text `components/leaderboard/H2HChart.tsx:65` |
| `chip-collection-reflow` | FIXED | Name chips wrap; badge `+n` is an operable, labelled disclosure `components/badges/PlayerBadges.tsx:109` |

### 6. Typography & Color (MEDIUM)

| Rule | Status | Where / what |
|---|---|---|
| `line-height` | PASS | Body 1.45–1.6 |
| `line-length` | PASS | Max-width containers |
| `font-pairing` | PASS | Fraunces display + Inter UI (§4) |
| `font-scale` | PASS | Defined scale (§4) |
| `contrast-readability` | PASS | Ivory on onyx 15.8:1 (dark equivalent) |
| `text-styles-system` | PASS | Roles: page-title, section-header, body, micro |
| `weight-hierarchy` | PASS | Inter 600 labels/400 body; Fraunces held at 500 by design |
| `color-semantic` | PASS | HSL tokens only |
| `color-dark-mode` | PASS | Desaturated warm ramp |
| `color-accessible-pairs` | FIXED | See color-contrast (computed with the §3 tokens) |
| `color-not-decorative-only` | PASS | Profit/loss signed; status pills icon + text |
| `truncation-strategy` | FIXED | Truncated legend names get the full name; long tokens now wrap (below) |
| `letter-spacing` | PASS | Default on body; tracking only on uppercase labels |
| `number-tabular` | PASS | `tabular-nums` on money/timers |
| `whitespace-balance` | PASS | Section gaps 24 px |
| `heading-line-balance` | FIXED | `text-wrap: balance` on headings `index.css:113` |
| `long-token-wrapping` | FIXED | `overflow-wrap: break-word` on body `index.css:96` |

### 7. Animation (MEDIUM)

| Rule | Status | Where / what |
|---|---|---|
| `duration-timing` | PASS | Tokens 120/200/260 ms |
| `transform-performance` | PASS | Transform/opacity only |
| `loading-states` | PASS | Skeleton only on first load; refresh dot otherwise |
| `excessive-motion` | PASS | Page rise + one state element |
| `easing` | PASS | Expo-out arriving |
| `motion-meaning` | PASS | Motion marks cause (sheet from trigger edge, press) |
| `state-transition` | PASS | Expand fades in, tabs/active states transition |
| `continuity` | PASS | Route rise, sheets from bottom |
| `parallax-subtle` | N/A | No parallax |
| `spring-physics` | PASS | Expo-out curves; sheet springs back on release |
| `exit-faster-than-enter` | PASS | Sheet 260 in / 180 out |
| `stagger-sequence` | PASS | Landing cards staggered; app lists intentionally not |
| `shared-element-transition` | DEFERRED | Would need the View Transitions API or a motion library across routes; not worth a dependency |
| `interruptible` | PASS | CSS transitions, nothing locks input |
| `no-blocking-animation` | PASS | No exit animation on routes |
| `fade-crossfade` | PASS | Content fades on replacement |
| `scale-feedback` | PASS | 0.97 press |
| `gesture-feedback` | FIXED | Sheet tracks the finger in real time while dragged |
| `hierarchy-motion` | PASS | Sheets rise from below |
| `motion-consistency` | PASS | Shared tokens |
| `opacity-threshold` | PASS | Fades complete |
| `modal-motion` | PASS | Bottom sheet slide / desktop zoom-fade |
| `navigation-direction` | DEFERRED | Route enter is a neutral 8 px rise for both directions; direction-aware transitions need history-direction tracking |
| `layout-shift-avoid` | PASS | No animated layout properties |
| `cancellable-state-transitions` | PASS | No animationend logic; drag sets the final state explicitly |

### 8. Forms & Feedback (MEDIUM)

| Rule | Status | Where / what |
|---|---|---|
| `input-labels` | FIXED | Calculator name/stack labelled (see form-labels) |
| `error-placement` | FIXED | Below the field with `aria-describedby` `components/auth/AuthPage.tsx:130` |
| `submit-feedback` | PASS | Spinner then toast/navigation |
| `ime-composition-enter` | FIXED | Session form Enter handlers skip composition `components/sessions/SessionForm.tsx:102`; homegame sheet now a real form `components/layout/HomegameDialog.tsx:108` |
| `required-indicators` | PASS | Convention used: the only optional field says “(optional)”; all others are required |
| `empty-states` | PASS | EmptyState with message + action |
| `toast-dismiss` | FIXED | 4 s confirmations / 8 s errors `components/ui/toaster.tsx:11` |
| `confirmation-dialogs` | PASS | Delete session/player/homegame, discard live game |
| `input-helper-text` | FIXED | Password and reset hints linked with `aria-describedby` `components/auth/AuthPage.tsx:365` |
| `disabled-states` | PASS | opacity 0.45 + `disabled` |
| `progressive-disclosure` | PASS | Payments section only after two players |
| `inline-validation` | PASS | No per-keystroke errors |
| `input-type-keyboard` | PASS | email / decimal inputMode |
| `password-toggle` | FIXED | Show/hide on every password field `components/common/PasswordInput.tsx:18` |
| `autofill-support` | FIXED | Reset dialog `new-password` `App.tsx:173`; profile nickname/username |
| `undo-support` | DEFERRED | Undo delete needs soft-delete in the backend |
| `success-feedback` | PASS | Toasts, Settled pill, land on the logged session |
| `error-recovery` | FIXED | Errors say what to do; screen-level error boundary with Reload `components/common/RouteErrorBoundary.tsx:26` |
| `multi-step-progress` | PASS | Auth steps have back; tour shows step x of y |
| `form-autosave` | DEFERRED | The live game is the server-side draft; autosaving the manual form would add new client storage behaviour |
| `sheet-dismiss-confirm` | DEFERRED | Edit-session sheet closes without asking; needs SessionForm dirty state lifted to the page (form-logic change) |
| `error-clarity` | FIXED | Auth messages state cause + fix (e.g. wrong password → reset) |
| `field-grouping` | PASS | Sectioned surfaces with section headings |
| `read-only-distinction` | PASS | Cashed-out amounts render as text, not disabled inputs |
| `focus-management` | FIXED | Failed auth submit focuses the invalid field |
| `error-summary` | N/A | No form reports several errors at once (validation stops at the first and focuses it); session form has its live status line |
| `touch-friendly-input` | FIXED | Calculator inputs 44 px (see touch-target-size) |
| `destructive-emphasis` | FIXED | Destructive actions red and, in the Club sheet, separated (see destructive-nav-separation) |
| `toast-accessibility` | PASS | Radix toasts are live regions and never take focus |
| `aria-live-errors` | FIXED | Inline auth errors `role=alert` |
| `contrast-feedback` | PASS | Loss 5.3:1, profit 7.9:1 on card |
| `timeout-feedback` | DEFERRED | Data hooks have no request timeout; adding one is data-layer work. Offline banner covers no-connection |
| `error-clears-on-fix` | FIXED | Field error and aria-invalid clear on the next edit |
| `no-premature-validation` | PASS | Validation on submit only |
| `keep-input-on-error` | PASS | Values kept on failure |
| `submit-not-pre-disabled` | DEFERRED | Log session stays disabled until balanced, with a live line explaining why (owner-approved §9); Add player disabled while empty |
| `unsaved-changes-guard` | DEFERRED | Same as sheet-dismiss-confirm |
| `forgiving-formats` | FIXED | Invite codes ignore spaces/hyphens `components/auth/AuthPage.tsx:80` |
| `allow-paste` | PASS | Never blocked |
| `persistent-errors` | FIXED | Form errors stay inline until the next attempt; error toasts 8 s |
| `dialog-focus` | PASS | Radix focus trap/return; tour now focuses its action |

### 9. Navigation Patterns (HIGH)

| Rule | Status | Where / what |
|---|---|---|
| `bottom-nav-limit` | PASS | 5 slots |
| `drawer-usage` | PASS | Club sheet = secondary |
| `back-behavior` | PASS | Back keeps scroll, falls back to / without history |
| `deep-linking` | PASS | Every screen has a URL |
| `tab-bar-ios` | PASS | Bottom tab bar |
| `top-app-bar-android` | PASS | Header with homegame switcher and Club |
| `nav-label-icon` | PASS | Icon + label on every tab |
| `nav-state-active` | PASS | Gold + indicator + `aria-current` |
| `nav-hierarchy` | PASS | Tabs vs Club sheet |
| `modal-escape` | FIXED | Close button + Escape existed; swipe-down to dismiss added (see swipe-clarity) |
| `search-accessible` | N/A | No search feature; rosters are small |
| `breadcrumb-web` | N/A | Hierarchy is two levels deep |
| `state-preservation` | PASS | Per-path scroll memory, remembered page data |
| `gesture-nav-support` | PASS | No edge gestures captured |
| `tab-badge` | PASS | None used |
| `overflow-menu` | PASS | Club sheet |
| `bottom-nav-top-level` | PASS | Top-level only |
| `adaptive-navigation` | PASS | Sidebar ≥768 px |
| `back-stack-integrity` | PASS | No stack resets |
| `navigation-consistency` | PASS | Same placement everywhere |
| `avoid-mixed-patterns` | PASS | Sidebar xor tab bar |
| `modal-vs-navigation` | PASS | Routes for flows, sheets for tasks |
| `focus-on-route-change` | FIXED | Focus moves to `<main>` after in-app navigation `components/layout/MainLayout.tsx:60` |
| `persistent-nav` | PASS | Tab bar on every signed-in screen |
| `destructive-nav-separation` | FIXED | Sign out / Delete homegame in their own group `components/layout/Header.tsx:285` |
| `empty-nav-state` | PASS | Live/New screens explain why when unavailable |

### 10. Charts & Data (LOW)

| Rule | Status | Where / what |
|---|---|---|
| `chart-type` | PASS | Line/area for trends |
| `color-guidance` | PASS | Gold vs ivory-grey, no red/green pair |
| `data-table` | FIXED | Text summary added; per-session values are listed on Sessions and My Stats |
| `pattern-texture` | PASS | H2H opponent dashed |
| `legend-visible` | PASS | Legend above the H2H chart; profit chart single series |
| `tooltip-on-interact` | PASS | Tooltips on hover/touch |
| `axis-labels` | PASS | Currency and session-number ticks |
| `responsive-chart` | PASS | ResponsiveContainer, ≤6 ticks |
| `empty-data-state` | PASS | Charts hidden under 2 points; page empty states |
| `loading-chart` | PASS | Skeletons |
| `animation-optional` | FIXED | See reduced-motion |
| `large-dataset` | N/A | Hundreds of points at most |
| `number-formatting` | FIXED | Sign before currency, grouped thousands `components/leaderboard/H2HChart.tsx:48` |
| `touch-target-chart` | PASS | Tooltip follows the finger along x |
| `no-pie-overuse` | N/A | No pie charts |
| `contrast-data` | PASS | Gold line 8:1 |
| `legend-interactive` | N/A | At most two series |
| `direct-labeling` | PASS | Final value shown as the hero figure above the chart |
| `tooltip-keyboard` | DEFERRED | Recharts 2 tooltips are pointer-only; the text summary carries the key values |
| `sortable-table` | N/A | No data tables |
| `axis-readability` | FIXED | Date ticks auto-skip `components/leaderboard/H2HChart.tsx:80` |
| `data-density` | PASS | One or two series |
| `trend-emphasis` | PASS | Thin line, 20 % fill |
| `gridline-subtle` | PASS | No grid, dashed zero line |
| `focusable-elements` | DEFERRED | Same as tooltip-keyboard (Recharts limitation) |
| `screen-reader-summary` | FIXED | See voiceover-sr |
| `error-state-chart` | DEFERRED | Data hooks swallow fetch errors; surfacing them needs hook changes (out of scope) |
| `export-option` | DEFERRED | Feature request; Share already exports a session as text |
| `drill-down-consistency` | PASS | H2H sheet closes back to Standings |
| `time-scale-clarity` | PASS | Week/Month/Year/All tabs; per-session x axis |
| `map-attribution` | N/A | No maps |
| `map-text-alternative` | N/A | No maps |
| `map-keyboard-no-drag` | N/A | No maps |
| `map-not-color-alone` | N/A | No maps |
| `normalized-choropleth` | N/A | No maps |
| `map-color-ramps` | N/A | No maps |
| `map-popup-text` | N/A | No maps |
| `map-clustering` | N/A | No maps |
| `map-reduced-motion` | N/A | No maps |

### Deferred, and why

- `haptic-feedback`: Vibration API is unsupported on iOS Safari (the main client); adding haptics is a product decision
- `image-optimization`: Landing art is WebP; app/badge icons are small PNGs. Re-encoding the badge/icon asset set is an asset-pipeline task
- `virtualize-lists`: Sessions list can pass 50 rows after a few years; needs pagination/virtualisation (data hook returns all rows, or a new dependency)
- `shared-element-transition`: Would need the View Transitions API or a motion library across routes; not worth a dependency
- `navigation-direction`: Route enter is a neutral 8 px rise for both directions; direction-aware transitions need history-direction tracking
- `undo-support`: Undo delete needs soft-delete in the backend
- `form-autosave`: The live game is the server-side draft; autosaving the manual form would add new client storage behaviour
- `sheet-dismiss-confirm`: Edit-session sheet closes without asking; needs SessionForm dirty state lifted to the page (form-logic change)
- `timeout-feedback`: Data hooks have no request timeout; adding one is data-layer work. Offline banner covers no-connection
- `submit-not-pre-disabled`: Log session stays disabled until balanced, with a live line explaining why (owner-approved §9); Add player disabled while empty
- `unsaved-changes-guard`: Same as sheet-dismiss-confirm
- `tooltip-keyboard`: Recharts 2 tooltips are pointer-only; the text summary carries the key values
- `focusable-elements`: Same as tooltip-keyboard (Recharts limitation)
- `error-state-chart`: Data hooks swallow fetch errors; surfacing them needs hook changes (out of scope)
- `export-option`: Feature request; Share already exports a session as text

### Parity fixes made in the same pass (from the read-only parity audit)

- Live game: the provider clears the previous homegame's live session on a switch and ignores late responses (`contexts/LiveSessionContext.tsx`).
- Lazy screens: `RouteErrorBoundary` reloads once on a stale chunk (sessionStorage guard), otherwise shows Something went wrong / Reload (`App.tsx`, `components/common/RouteErrorBoundary.tsx`).
- Live game refetches (existing fetch) when opening `/` or `/live-session`.
- View cache: `clearStale()` after logging a session, adding a player, approving a claim; Sessions holds Edit/Delete/Mark settled while rows are remembered data (`hooks/useStaleWhileLoading.ts`).
- Standings: separate switch guards for players and sessions (`pages/LeaderboardPage.tsx`).
- Tour copy says “This is me” (`components/tutorial/tours.ts`).

## 15. Invite links carry the code (ported from Variant B, hardened)

Share invite now sends `/auth?mode=signup&code=XXXXXXXX` (code also repeated in plain text). The auth page prefills "Join with code" from the link, or from a device-local copy after the email-confirmation round trip, and selects the Join tab. New player with an invite link: 10 → 6 taps, no typing.
Safety: only `^[A-Z0-9]{8}$` (after stripping spaces/hyphens) is accepted; the code is removed from the address bar after reading; the device copy expires after 7 days and is cleared on a successful join; joining always needs the player's own tap (prefill only, same `joinHomegame` call); `Referrer-Policy: strict-origin-when-cross-origin` keeps the URL from leaking to third-party origins.

# Nav Revamp Design — Glowing Gold

**Date:** 2026-04-15  
**Scope:** Mobile header (top bar) + bottom navigation bar. Desktop sidebar is out of scope.

---

## Goal

Elevate the visual quality of the top header and bottom nav without changing any layout structure or navigation logic. The existing element positions, tab items, labels, and FAB placement all stay the same — this is a pure styling pass.

The chosen direction is **B (Glowing Gold)**: darker backgrounds, stronger gold accent borders, glow effects on key interactive elements, and a pill-shaped active state on the bottom nav.

---

## Header (`src/components/layout/Header.tsx`)

### Background & border
- Background: `rgba(13,16,30,0.97)` (currently `bg-card/80`)
- Border bottom: `rgba(200,155,60,0.28)` (currently `border-border/50` ~18% opacity warm gold)
- Add a subtle downward gold bloom: `box-shadow: 0 2px 20px rgba(200,155,60,0.08)`

### Homegame icon
- Add gold glow: `box-shadow: 0 0 12px rgba(200,155,60,0.45)`
- Keep existing size (w-9 h-9) and border-radius

### Homegame name + role label
- Name: keep as-is (`font-semibold`, truncated)
- Role label: replace the `<Badge>` chip with plain uppercase gold text
  - Owner: `text-[9px] font-bold uppercase tracking-wide text-gold`
  - Member: same but `text-gold/60`

### Settings button
- Replace plain ghost `Button` with a gold-tinted version:
  - Background: `rgba(200,155,60,0.10)`
  - Border: `1px solid rgba(200,155,60,0.28)`
  - Border-radius: `rounded-lg` (8px)
  - Icon color: `text-gold/70`

---

## Bottom Navigation (`src/components/layout/Navigation.tsx`)

### Bar background & border
- Background: `rgba(10,13,24,0.98)` (currently `bg-card`)
- Border top: `rgba(200,155,60,0.22)` (currently `border-border/50`)
- Add upward gold bloom: `box-shadow: 0 -4px 28px rgba(200,155,60,0.07)`

### Inactive tabs
- Icon + label color: `rgba(237,232,216,0.30)` — slightly dimmer than current `text-muted-foreground` to increase active/inactive contrast

### Active tab
- Wrap icon + label in a rounded pill: `bg-gold/15 rounded-[9px] px-1.5 py-1`
- Icon background: `bg-gold` with glow `shadow-[0_0_8px_rgba(200,155,60,0.6)]`
- Label: `text-gold font-bold`

### FAB (center plus button)
- Keep size (w-12 h-12) and gradient (`bg-gold`)
- Upgrade glow:
  - Outer halo ring: `ring-2 ring-gold/20`
  - Drop shadow: `shadow-[0_6px_22px_rgba(200,155,60,0.55)]`
- Keep existing `-mt-5` elevation

---

## What does NOT change

- Layout structure of both components
- Tab items, labels, order, routes
- `data-tutorial` attributes
- Desktop sidebar styles
- All dialog/dropdown logic inside `Header.tsx`
- Safe-area insets and fixed positioning

---

## Files to modify

| File | Change |
|---|---|
| `src/components/layout/Header.tsx` | Header bar styles, icon glow, role label, settings button |
| `src/components/layout/Navigation.tsx` | Bar styles, active pill, inactive dimming, FAB glow |

No new files. No new components. No logic changes.

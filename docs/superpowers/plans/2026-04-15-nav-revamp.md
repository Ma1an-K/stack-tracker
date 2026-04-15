# Nav Revamp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the "Glowing Gold" visual treatment to the mobile top header and bottom nav bar — darker backgrounds, stronger gold borders/glows, pill active state — without changing any layout structure or navigation logic.

**Architecture:** Pure styling pass on two existing components. No new files, no new components, no logic changes. Tailwind arbitrary-value classes are used for precise rgba colors; inline `style` props are avoided except where Tailwind's responsive override behavior requires them.

**Tech Stack:** React, Tailwind CSS v3, lucide-react, react-router-dom NavLink

---

## Files Modified

| File | What changes |
|---|---|
| `src/components/layout/Header.tsx` | Bar bg/border/shadow, icon glow, role label, settings button |
| `src/components/layout/Navigation.tsx` | Bar bg/border/shadow, inactive tab color, active pill, FAB glow |

---

### Task 1: Header — bar background, border, and drop shadow

**Files:**
- Modify: `src/components/layout/Header.tsx:138`

This task updates the `<header>` element's background, border color, and adds a downward gold glow. The current classes are `border-b border-border/50 bg-card/80 backdrop-blur-sm`.

- [ ] **Step 1: Update the `<header>` opening tag**

In `src/components/layout/Header.tsx`, replace line 138:

```tsx
// Before
<header className="border-b border-border/50 bg-card/80 backdrop-blur-sm fixed top-0 left-0 right-0 z-50 pt-[env(safe-area-inset-top)]">

// After
<header className="border-b fixed top-0 left-0 right-0 z-50 pt-[env(safe-area-inset-top)] backdrop-blur-sm bg-[rgba(13,16,30,0.97)] border-[rgba(200,155,60,0.28)] shadow-[0_2px_20px_rgba(200,155,60,0.08)]">
```

- [ ] **Step 2: Start the dev server and verify visually**

```bash
npm run dev
```

Open the app. The top bar should now appear noticeably darker with a faint gold bottom border and a subtle gold glow beneath it.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/Header.tsx
git commit -m "style: darken header bar with gold border and glow"
```

---

### Task 2: Header — homegame icon gold glow

**Files:**
- Modify: `src/components/layout/Header.tsx:148,151`

The homegame icon (both the owner-clickable button version and the static img version) should glow gold.

- [ ] **Step 1: Add glow to the owner icon button**

At line 145–149, the `<button>` wraps an `<img>`. Add the glow shadow to the `<img>`:

```tsx
// Before (line ~148)
<img src={getIconSrc(homegame?.icon_id)} alt={homegame?.name || 'Stack Tracker'} className="w-9 h-9 rounded-lg object-cover" />

// After
<img src={getIconSrc(homegame?.icon_id)} alt={homegame?.name || 'Stack Tracker'} className="w-9 h-9 rounded-lg object-cover shadow-[0_0_12px_rgba(200,155,60,0.45)]" />
```

- [ ] **Step 2: Add glow to the non-owner static img**

At line ~151:

```tsx
// Before
<img data-tutorial="tutorial-homegame-icon" src={getIconSrc(homegame?.icon_id)} alt={homegame?.name || 'Stack Tracker'} className="w-9 h-9 rounded-lg object-cover" />

// After
<img data-tutorial="tutorial-homegame-icon" src={getIconSrc(homegame?.icon_id)} alt={homegame?.name || 'Stack Tracker'} className="w-9 h-9 rounded-lg object-cover shadow-[0_0_12px_rgba(200,155,60,0.45)]" />
```

- [ ] **Step 3: Verify visually**

The homegame icon should have a soft gold bloom around it against the dark header.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/Header.tsx
git commit -m "style: add gold glow to header homegame icon"
```

---

### Task 3: Header — role label (replace Badge chip)

**Files:**
- Modify: `src/components/layout/Header.tsx:162–167`

Replace the `<Badge>` chip for Owner/Member with plain uppercase gold text. The `Badge` import stays (used elsewhere in the file for the homegame list dropdown).

- [ ] **Step 1: Replace the role badge in the homegame dropdown trigger**

Find the block at lines ~162–167 inside the `<Button>` trigger:

```tsx
// Before
<span className="text-xs text-muted-foreground flex items-center gap-1">
  {isOwner ? (
    <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-normal">Owner</Badge>
  ) : homegame ? (
    <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-normal">Member</Badge>
  ) : null}
</span>

// After
<span className="text-xs flex items-center gap-1">
  {isOwner ? (
    <span className="text-[9px] font-bold uppercase tracking-wide text-gold">Owner</span>
  ) : homegame ? (
    <span className="text-[9px] font-bold uppercase tracking-wide text-gold/60">Member</span>
  ) : null}
</span>
```

- [ ] **Step 2: Verify visually**

The owner/member label under the homegame name should now be small all-caps gold text with no chip background.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/Header.tsx
git commit -m "style: replace role Badge chip with plain gold uppercase label"
```

---

### Task 4: Header — settings button gold tint

**Files:**
- Modify: `src/components/layout/Header.tsx:212`

Update the settings gear `Button` to have a gold-tinted border and background.

- [ ] **Step 1: Update the settings Button**

Find at line ~212:

```tsx
// Before
<Button data-tutorial="tutorial-settings" variant="ghost" size="icon" className="h-8 w-8">
  <Settings className="h-4 w-4" />
</Button>

// After
<Button
  data-tutorial="tutorial-settings"
  variant="ghost"
  size="icon"
  className="h-8 w-8 rounded-lg border border-[rgba(200,155,60,0.28)] bg-[rgba(200,155,60,0.10)] hover:bg-[rgba(200,155,60,0.18)] text-gold/70 hover:text-gold transition-colors"
>
  <Settings className="h-4 w-4" />
</Button>
```

- [ ] **Step 2: Verify visually**

The gear icon button should have a visible gold-tinted border and slightly warm background. On hover it should brighten.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/Header.tsx
git commit -m "style: gold tint settings button in header"
```

---

### Task 5: Navigation — bar background, border, and top glow

**Files:**
- Modify: `src/components/layout/Navigation.tsx:29`

Update the `<nav>` element's mobile background, border color, and add a top-facing gold glow. Desktop (`md:`) styles stay untouched.

- [ ] **Step 1: Update the `<nav>` className**

Find at line 29:

```tsx
// Before
<nav className="shrink-0 border-t border-border/50 bg-card z-50 md:fixed md:top-12 md:left-0 md:bottom-0 md:right-auto md:border-t-0 md:border-r md:border-border/50 md:h-[calc(100dvh-3rem)] md:w-56 md:bg-background">

// After
<nav className="shrink-0 border-t z-50 bg-[rgba(10,13,24,0.98)] border-[rgba(200,155,60,0.22)] shadow-[0_-4px_28px_rgba(200,155,60,0.07)] md:fixed md:top-12 md:left-0 md:bottom-0 md:right-auto md:border-t-0 md:border-r md:border-border/50 md:h-[calc(100dvh-3rem)] md:w-56 md:bg-background md:shadow-none">
```

Key: `md:shadow-none` removes the glow on desktop, `md:bg-background` and `md:border-border/50` restore the desktop sidebar appearance.

- [ ] **Step 2: Verify on mobile and desktop**

On mobile: nav bar should be darker with a subtle gold border and upward glow.
On desktop (≥768px): left sidebar should look identical to before — no glow, standard background.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/Navigation.tsx
git commit -m "style: darken mobile nav bar with gold border and top glow"
```

---

### Task 6: Navigation — active pill + inactive tab dimming

**Files:**
- Modify: `src/components/layout/Navigation.tsx:31–84`

This is the most structural change. The current NavLink uses a `className` function to color the icon and label. To add a pill background behind just the icon+label (not the full flex-1 width), we switch to the `children` render-prop pattern so `isActive` is available inside the NavLink.

The left nav items (`mobileNavLeft`) and right nav items (`mobileNavRight`) both get this treatment.

- [ ] **Step 1: Refactor the left nav items**

Replace the entire left nav map (lines ~33–49) with:

```tsx
{mobileNavLeft.map((item) => (
  <NavLink
    key={item.to}
    to={item.to}
    end={item.to === '/'}
    data-tutorial={item['data-tutorial']}
    className="flex-1 flex flex-col items-center justify-center min-h-[44px] py-1 transition-all duration-150"
  >
    {({ isActive }) => (
      <div className={cn(
        'flex flex-col items-center gap-0.5 px-1.5 py-1 rounded-[9px] transition-all duration-150',
        isActive ? 'bg-gold/15' : ''
      )}>
        <item.icon className={cn(
          'h-5 w-5',
          isActive
            ? 'text-gold drop-shadow-[0_0_6px_rgba(200,155,60,0.6)]'
            : 'text-[rgba(237,232,216,0.30)]'
        )} />
        <span className={cn(
          'text-[10px] font-medium',
          isActive ? 'text-gold font-bold' : 'text-[rgba(237,232,216,0.30)]'
        )}>{item.label}</span>
      </div>
    )}
  </NavLink>
))}
```

Note the `end={item.to === '/'}` prop — this ensures the Dashboard route only matches exactly `/`, not every route (react-router-dom default for `/` is prefix-match).

- [ ] **Step 2: Refactor the right nav items**

Replace the right nav map (lines ~67–84) with the same pattern:

```tsx
{mobileNavRight.map((item) => (
  <NavLink
    key={item.to}
    to={item.to}
    data-tutorial={item['data-tutorial']}
    className="flex-1 flex flex-col items-center justify-center min-h-[44px] py-1 transition-all duration-150"
  >
    {({ isActive }) => (
      <div className={cn(
        'flex flex-col items-center gap-0.5 px-1.5 py-1 rounded-[9px] transition-all duration-150',
        isActive ? 'bg-gold/15' : ''
      )}>
        <item.icon className={cn(
          'h-5 w-5',
          isActive
            ? 'text-gold drop-shadow-[0_0_6px_rgba(200,155,60,0.6)]'
            : 'text-[rgba(237,232,216,0.30)]'
        )} />
        <span className={cn(
          'text-[10px] font-medium',
          isActive ? 'text-gold font-bold' : 'text-[rgba(237,232,216,0.30)]'
        )}>{item.label}</span>
      </div>
    )}
  </NavLink>
))}
```

- [ ] **Step 3: Verify visually on mobile**

Navigate between tabs. The active tab should show a warm gold pill behind the icon+label, with the icon glowing. Inactive tabs should be noticeably dimmer than before. The pill should be compact — not stretching full width.

- [ ] **Step 4: Verify the desktop sidebar is unaffected**

At ≥768px the bottom nav items are hidden (`md:hidden`). Confirm the desktop sidebar still looks and functions the same.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/Navigation.tsx
git commit -m "style: add gold pill active state and dim inactive tabs in bottom nav"
```

---

### Task 7: Navigation — FAB glow upgrade

**Files:**
- Modify: `src/components/layout/Navigation.tsx:51–65`

Upgrade the center FAB's glow — add a soft outer halo ring and a stronger drop shadow.

- [ ] **Step 1: Update the FAB button div**

Find at lines ~62–64 the inner FAB div:

```tsx
// Before
<div className="flex items-center justify-center w-12 h-12 rounded-full bg-gold text-background shadow-lg shadow-gold/30">
  <Plus className="h-6 w-6" strokeWidth={2.5} />
</div>

// After
<div className="flex items-center justify-center w-12 h-12 rounded-full bg-gold text-background ring-2 ring-gold/20 shadow-[0_6px_22px_rgba(200,155,60,0.55)]">
  <Plus className="h-6 w-6" strokeWidth={2.5} />
</div>
```

- [ ] **Step 2: Verify visually**

The + button should have a more pronounced gold aura — brighter and with a subtle ring around the circle edge.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/Navigation.tsx
git commit -m "style: upgrade FAB glow with ring and stronger shadow"
```

---

## Self-Review

**Spec coverage:**
- ✅ Header bg/border/shadow → Task 1
- ✅ Icon gold glow → Task 2
- ✅ Role label → Task 3
- ✅ Settings button → Task 4
- ✅ Nav bar bg/border/shadow → Task 5
- ✅ Inactive tab dimming → Task 6
- ✅ Active tab pill → Task 6
- ✅ FAB glow → Task 7
- ✅ Desktop sidebar untouched → Task 5 (md:shadow-none, md:bg-background, md:border-border/50)

**No placeholders:** All steps contain exact code.

**Type consistency:** No types or function signatures involved — pure JSX className changes.

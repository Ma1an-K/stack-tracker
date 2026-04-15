# Homegame Icon Click & Badge Toggles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the homegame icon clickable (opens icon picker) and add a badge toggle dialog for owners.

**Architecture:** DB migration adds `disabled_badges TEXT[]` to `homegames`. The type, badge computation, and two call-sites are updated. Header gets a clickable icon wrapper and a new badges dialog.

**Tech Stack:** React, TypeScript, Supabase, Tailwind, shadcn/ui Switch

---

### Task 1: DB migration + type update

**Files:**
- Create: `supabase/migrations/20260415000002_add_disabled_badges.sql`
- Modify: `src/types/database.ts`

- [ ] **Step 1: Write migration**

```sql
-- supabase/migrations/20260415000002_add_disabled_badges.sql
ALTER TABLE public.homegames
  ADD COLUMN IF NOT EXISTS disabled_badges TEXT[] DEFAULT '{}';
```

- [ ] **Step 2: Update Homegame type**

In `src/types/database.ts`, add `disabled_badges` to the `Homegame` interface:

```ts
export interface Homegame {
  id: string;
  user_id: string;
  name: string;
  currency: string;
  icon_id: string | null;
  disabled_badges: string[] | null;
  created_at: string;
  updated_at: string;
}
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260415000002_add_disabled_badges.sql src/types/database.ts
git commit -m "feat: add disabled_badges column to homegames"
```

---

### Task 2: Update computeHomegameBadges to filter disabled badges

**Files:**
- Modify: `src/lib/badges.ts`

- [ ] **Step 1: Add disabledBadges param and filter**

Update the function signature and add a filter at the end:

```ts
export function computeHomegameBadges(
  sessions: SessionWithPlayers[],
  players: Player[],
  disabledBadges: string[] = []
): Map<string, PlayerBadge[]> {
  const badgeMap = new Map<string, PlayerBadge[]>();
  players.forEach(p => badgeMap.set(p.id, []));

  const playerSessions = new Map<string, PlayerSessionData[]>();
  players.forEach(p => playerSessions.set(p.id, []));

  const sortedSessions = [...sessions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  sortedSessions.forEach(session => {
    session.session_players.forEach(sp => {
      const list = playerSessions.get(sp.player_id);
      if (list) {
        const buyIn = Number(sp.buy_in);
        const cashOut = Number(sp.cash_out);
        list.push({ date: session.date, buyIn, cashOut, profit: cashOut - buyIn });
      }
    });
  });

  computeStreaks(playerSessions, badgeMap);
  computeCompetitiveBadges(playerSessions, badgeMap);
  computeMilestoneBadges(playerSessions, badgeMap);
  computeAchievementBadges(playerSessions, badgeMap);

  // Remove disabled badges
  if (disabledBadges.length > 0) {
    badgeMap.forEach((badges, playerId) => {
      badgeMap.set(
        playerId,
        badges.filter(pb => !disabledBadges.includes(pb.badge.id))
      );
    });
  }

  return badgeMap;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/badges.ts
git commit -m "feat: filter disabled badges in computeHomegameBadges"
```

---

### Task 3: Update Leaderboard call-site

**Files:**
- Modify: `src/components/leaderboard/Leaderboard.tsx`

- [ ] **Step 1: Pull homegame from context and pass disabled_badges**

Add `homegame` to the `useAuthContext` destructure and update the `useMemo`:

```ts
const { user, homegame } = useAuthContext();

// Compute badges from ALL sessions (not filtered) since badges are cumulative
const badgeMap = useMemo(
  () => computeHomegameBadges(sessions, players, homegame?.disabled_badges ?? []),
  [sessions, players, homegame?.disabled_badges]
);
```

- [ ] **Step 2: Commit**

```bash
git add src/components/leaderboard/Leaderboard.tsx
git commit -m "feat: pass disabled_badges to leaderboard badge computation"
```

---

### Task 4: Update usePersonalStats call-site

**Files:**
- Modify: `src/hooks/usePersonalStats.ts`

- [ ] **Step 1: Pass disabled_badges when computing badges**

The `myPlayers` query already fetches the full `homegame` object. Find the `computeHomegameBadges` call at line ~223 and update it:

```ts
const homegameObj = myPlayer.homegame as Homegame;
const badgeMap = computeHomegameBadges(
  allSessions as SessionWithPlayers[],
  allPlayersInHomegame,
  homegameObj?.disabled_badges ?? []
);
```

(`homegameObj` is already available as `player.homegame as Homegame` in the surrounding scope — confirm the variable name at that line and use it.)

- [ ] **Step 2: Commit**

```bash
git add src/hooks/usePersonalStats.ts
git commit -m "feat: pass disabled_badges to personal stats badge computation"
```

---

### Task 5: Clickable icon in Header

**Files:**
- Modify: `src/components/layout/Header.tsx`

- [ ] **Step 1: Wrap icon in button for owners**

Replace the plain `<img>` at line ~124:

```tsx
{isOwner ? (
  <button
    onClick={() => setIconPickerOpen(true)}
    className="rounded-lg focus:outline-none hover:ring-2 hover:ring-yellow-500/50 transition-all"
    aria-label="Change homegame icon"
  >
    <img
      src={getIconSrc(homegame?.icon_id)}
      alt={homegame?.name || 'Stack Tracker'}
      className="w-9 h-9 rounded-lg object-cover"
    />
  </button>
) : (
  <img
    src={getIconSrc(homegame?.icon_id)}
    alt={homegame?.name || 'Stack Tracker'}
    className="w-9 h-9 rounded-lg object-cover"
  />
)}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/layout/Header.tsx
git commit -m "feat: make homegame icon clickable for owners"
```

---

### Task 6: Badge toggle dialog in Header

**Files:**
- Modify: `src/components/layout/Header.tsx`

- [ ] **Step 1: Add imports**

Add to the existing imports:
- `Switch` from `@/components/ui/switch`
- `Award` from `lucide-react`
- `BADGE_DEFINITIONS` from `@/lib/badges`

- [ ] **Step 2: Add state**

```tsx
const [badgesDialogOpen, setBadgesDialogOpen] = useState(false);
```

- [ ] **Step 3: Add handler**

```tsx
const handleToggleBadge = async (badgeId: string) => {
  const current = homegame?.disabled_badges ?? [];
  const updated = current.includes(badgeId)
    ? current.filter(id => id !== badgeId)
    : [...current, badgeId];
  await updateHomegame({ disabled_badges: updated });
};
```

- [ ] **Step 4: Add dropdown item (inside the `{isOwner && ...}` block)**

After the existing "Change Icon" item:

```tsx
<DropdownMenuItem onClick={() => setBadgesDialogOpen(true)}>
  <Award className="mr-2 h-4 w-4" />
  Badges
</DropdownMenuItem>
```

- [ ] **Step 5: Add badge toggle dialog (after the icon picker dialog)**

```tsx
<Dialog open={badgesDialogOpen} onOpenChange={setBadgesDialogOpen}>
  <DialogContent className="sm:max-w-sm">
    <DialogHeader>
      <DialogTitle>Homegame Badges</DialogTitle>
      <DialogDescription>Toggle which badges are shown for all members.</DialogDescription>
    </DialogHeader>
    <div className="space-y-3 mt-2">
      {Object.values(BADGE_DEFINITIONS).map((badge) => {
        const disabled = (homegame?.disabled_badges ?? []).includes(badge.id);
        return (
          <div key={badge.id} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">{badge.emoji}</span>
              <div>
                <p className="text-sm font-medium">{badge.name}</p>
                <p className="text-xs text-muted-foreground">{badge.description}</p>
              </div>
            </div>
            <Switch
              checked={!disabled}
              onCheckedChange={() => handleToggleBadge(badge.id)}
            />
          </div>
        );
      })}
    </div>
  </DialogContent>
</Dialog>
```

- [ ] **Step 6: Commit**

```bash
git add src/components/layout/Header.tsx
git commit -m "feat: add badge toggle dialog for homegame owners"
```

---

### Task 7: Push

- [ ] **Step 1: Push all commits**

```bash
git push
```

# Login Screen Revamp — Design Spec
_Stack Tracker · 2026-04-15_

---

## Overview

Replace the current tab-based card auth UI with an editorial, full-screen design that matches the app's dark poker aesthetic. The new design uses a bold typographic headline in the top half and a minimal form in the bottom half, separated by a glowing gold divider line.

---

## Visual Language

| Token | Value |
|---|---|
| Background | `#090b10` (matches `bg-background`) |
| Headline colour | `#f2e8ce` (warm off-white) |
| App tag colour | `#2e2416` (very dark gold, barely visible) |
| Divider | `linear-gradient` from `rgba(200,155,60,0.45)` → transparent |
| Field label | `#4a3d26`, 7.5px, uppercase, tracking 1.5px |
| Field underline (idle) | `#1e1a12` |
| Field underline (focused) | `rgba(200,155,60,0.5)` + glow `rgba(200,155,60,0.28)` |
| Primary button | `linear-gradient(135deg, #d4a942, #b8872e)` + gold drop-shadow |
| Secondary button | transparent + `rgba(200,155,60,0.18)` border |
| Button text (primary) | 13px, `font-weight: 500`, `letter-spacing: 0.3px`, title case |
| Button text (secondary) | 13px, `font-weight: 400`, `letter-spacing: 0.3px`, title case |
| Ambient glow top-left | `radial-gradient rgba(200,155,60,0.10)` |
| Ambient glow bottom-right | `radial-gradient rgba(200,155,60,0.055)` |
| ♠ glyph glow | `text-shadow` 8px + 20px + 40px gold halos |

---

## Layout Structure (all screens)

```
┌─────────────────────────┐
│  ♠  (glowing glyph)     │  ← hero icon, 20px, gold glow
│  Bold headline          │  ← 17px, weight 800, line-height 1.25
│  app tag                │  ← "Stack Tracker", tiny, barely visible
│                         │
│  (flex spacer)          │  ← pushes form to bottom
│─────────────────────────│  ← glowing gold divider
│  FIELD LABEL            │
│  ___________________    │  ← underline input (idle)
│  FIELD LABEL            │
│  ___________________    │  ← underline input (focused = gold)
│                         │
│  [ Primary Button   ]   │  ← gold gradient, drop-shadow
│  [ Secondary Button ]   │  ← outline, faint gold border
│                         │
│  micro link             │  ← tiny, very dim
└─────────────────────────┘
```

---

## Screens

### 1. Sign In
- **Hero glyph:** ♠
- **Headline:** "Track every hand. Settle every debt."
- **Fields:** Email, Password
- **Primary:** "Sign In"
- **Secondary:** "Create Account"
- **Micro link:** "Forgot password? Reset it" → navigates to Forgot PW step

### 2. Sign Up
- **Hero glyph:** ♠
- **Headline:** "Join the table."
- **Fields:** Username, Email, Password
- **Primary:** "Create Account"
- **Secondary:** "Back to Sign In"
- **No micro link**

### 3. Forgot Password
- **Hero glyph:** 🔑
- **Headline:** "Reset your password."
- **Fields:** Email
- **Helper text:** "We'll send a reset link straight to your inbox." (7.5px, very dim)
- **Primary:** "Send Reset Link"
- **Secondary:** "Back to Sign In"

### 4. Homegame Setup (post sign-up, no homegame)
- **Hero glyph:** ♠
- **Headline:** "Welcome to the table."
- **Toggle (two tiles, side by side):**
  - **Create Game** — gold tint, gold border, gold glow when selected
  - **Join with Code** — silver/cool tint, silver border (🔗 emoji + label)
- **Fields:** Game Name (Create mode) or Invite Code (Join mode)
- **Primary:** "Create Game" / "Join Game" (updates with mode)
- **Micro link:** "Back to sign in"

---

## Toggle Tile Styling

| State | Background | Border | Text/icon colour |
|---|---|---|---|
| Selected (gold) | `rgba(200,155,60,0.07)` | `rgba(200,155,60,0.32)` | `#c89b3c` + glow |
| Unselected (silver) | `rgba(180,190,200,0.04)` | `rgba(180,190,200,0.14)` | `#5a6a78` |

---

## Navigation / State Flow

The current `step` type is `'auth' | 'setup' | 'forgot'`. The revamp extends it to include `'signup'`:

```
/auth
  ├─ step: 'auth'     → Sign In screen (default)
  ├─ step: 'signup'   → Sign Up screen (new — replaces the tabs approach)
  ├─ step: 'forgot'   → Forgot Password screen
  └─ step: 'setup'    → Homegame Setup screen (user logged in, no homegame)

"Create Account" on Sign In  → setStep('signup')
"Back to Sign In" on Sign Up → setStep('auth')
Successful auth + homegame   → navigate('/') replace
```

All existing auth logic (signIn, signUp, etc.) is unchanged. Only the `Step` type, JSX, and styles are modified.

---

## Implementation Scope

**Files to change:**
- `src/components/auth/AuthPage.tsx` — full JSX and className rewrite
- No logic changes, no new files, no routing changes

**Out of scope:**
- Auth logic (signIn, signUp, resetPasswordForEmail, etc.)
- Routing
- Supabase integration
- Any other page or component

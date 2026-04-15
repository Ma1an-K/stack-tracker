# Install Prompt Tutorial Step — Design Spec

**Date:** 2026-04-15

## Overview

Add an "Add to Home Screen" step as the final step (step 8) of both the owner and player onboarding tutorial tours. The step renders a centered tooltip card with platform-specific content. No spotlight — there is no specific DOM element to highlight for this step.

---

## Trigger Logic

The install step appears as the last step of both `OWNER_TOUR` and `PLAYER_TOUR`. It is silently skipped (no card shown, tour completes) when:
- The app is already running in standalone/installed mode (`(display-mode: standalone)` or `navigator.standalone === true`)
- The platform is desktop or otherwise unsupported (no `beforeinstallprompt` event and not iOS)

When skipped, `nextStep()` is called automatically — the user never sees a blank step.

---

## Platform Behaviour

| Platform | Detection | Card content |
|----------|-----------|--------------|
| Android / Chrome | `beforeinstallprompt` event was captured | Gold "Install App" button that fires `deferredPrompt.prompt()` |
| iOS / Safari | `/iPad\|iPhone\|iPod/.test(navigator.userAgent)` | Instructions: "Tap **Share ↑** then tap **Add to Home Screen**" |
| Already installed | `matchMedia('(display-mode: standalone)').matches` or `navigator.standalone` | Step skipped silently |
| Unsupported / desktop | None of the above | Step skipped silently |

---

## Tour Step Configs

Add to both `OWNER_TOUR` and `PLAYER_TOUR` in `src/components/tutorial/tours.ts`:

```ts
{
  targetId: 'tutorial-install',
  title: 'Add to Home Screen',
  description: 'Install Stack Tracker on your home screen for the best experience — faster loads, full screen, no browser bar.',
}
```

The `targetId: 'tutorial-install'` is a sentinel value. `TutorialOverlay` checks for it and renders the install card instead of the normal spotlight tooltip. No DOM element needs this attribute.

---

## Components

### `src/hooks/useInstallPrompt.ts`

```ts
export type InstallPlatform = 'android' | 'ios' | 'installed' | 'unsupported';

export interface InstallPromptInfo {
  platform: InstallPlatform;
  trigger: (() => void) | null;
}

export function useInstallPrompt(): InstallPromptInfo
```

- Listens for `beforeinstallprompt` on mount, calls `e.preventDefault()` to defer it, stores the event in state
- Computes `isStandalone` from `matchMedia('(display-mode: standalone)').matches || navigator.standalone`
- Computes `isIOS` from `/iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream`
- Returns:
  - `{ platform: 'installed', trigger: null }` if standalone
  - `{ platform: 'ios', trigger: null }` if iOS and not standalone
  - `{ platform: 'android', trigger: fn }` if `deferredPrompt` captured — `trigger` calls `deferredPrompt.prompt()` then clears the deferred event
  - `{ platform: 'unsupported', trigger: null }` otherwise

### `src/components/tutorial/TutorialOverlay.tsx` (modified)

Add `installPrompt: InstallPromptInfo` prop.

When `step.targetId === 'tutorial-install'`:
- Skip the spotlight div entirely
- If `platform` is `'installed'` or `'unsupported'`: call `onNext()` immediately via `useEffect` (skip silently)
- If `platform` is `'android'`: render card with gold "Install App" button; tapping calls `installPrompt.trigger()` then `onNext()`
- If `platform` is `'ios'`: render card with text instructions: "Tap **Share ↑** in your browser, then tap **Add to Home Screen**"
- Both android and ios cards show a "Maybe later" link that calls `onSkip()`
- Card is centered in the viewport (fixed, centered with `top: 50%, left: 50%, transform: translate(-50%, -50%)`)

When `step.targetId` is anything else, behaviour is unchanged.

### `src/components/layout/MainLayout.tsx` (modified)

- Import and call `useInstallPrompt()`
- Pass `installPrompt` to `<TutorialOverlay>`

---

## Files to Create / Modify

| Action | File |
|--------|------|
| Create | `src/hooks/useInstallPrompt.ts` |
| Modify | `src/components/tutorial/tours.ts` — add step 8 to both tours |
| Modify | `src/components/tutorial/TutorialOverlay.tsx` — handle install step |
| Modify | `src/components/layout/MainLayout.tsx` — wire useInstallPrompt, pass prop |

---

## Constraints

- No new routes or pages
- No database changes
- `useInstallPrompt` is client-only — no SSR guards needed (this is a browser-only PWA)
- The `BeforeInstallPromptEvent` type is not in the standard TypeScript DOM lib — declare it locally in the hook file
- If `trigger()` is called and the user dismisses the native prompt, the tour step still advances (`onNext()` is called after `userChoice` resolves)

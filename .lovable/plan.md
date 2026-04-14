

## Fix: iOS Standalone Bottom Nav Gap

### Problem
The `#root` uses `position: fixed` which creates a virtual viewport container that doesn't extend to the physical screen edge in iOS standalone mode. The nav anchors to this shortened container instead of the real screen bottom.

### Changes (3 files)

**1. `src/index.css` -- Remove `position: fixed` from `#root`**

Replace the current `#root` block:
```css
#root {
  position: relative;
  min-height: 100dvh;
  min-height: -webkit-fill-available;
  width: 100%;
  max-width: 100vw;
  overflow-x: hidden;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
```

Also remove `overflow: hidden` from `html` and `body` (since `#root` is no longer fixed, the document needs to scroll naturally):
```css
html {
  height: 100%;
  overscroll-behavior: none;
  background-color: hsl(220 14% 15%);
}
body {
  height: 100%;
  overscroll-behavior: none;
  /* keep existing @apply and font-family */
}
```

Remove the `.safe-area-bottom-fill` class (no longer needed -- padding on the nav itself will handle it).

**2. `src/components/layout/MainLayout.tsx` -- Use `min-h-[100dvh]`**

```tsx
<div className="min-h-[100dvh] bg-background pt-[calc(3rem+env(safe-area-inset-top))]">
```

**3. `src/components/layout/Navigation.tsx` -- Simplify safe-area handling**

- Remove the `<div className="safe-area-bottom-fill md:hidden" />` spacer div entirely
- Add `pb-[env(safe-area-inset-bottom)]` directly to the mobile nav flex container so the nav content sits above the home indicator and the nav background extends behind it:

```tsx
<nav className="fixed bottom-0 left-0 right-0 border-t border-border/50 bg-card z-50 pb-[env(safe-area-inset-bottom)] md:fixed md:top-12 md:left-0 md:bottom-auto md:right-auto md:border-t-0 md:border-r md:border-border/50 md:h-[calc(100dvh-3rem)] md:w-56 md:bg-background md:pb-0">
  {/* No filler div */}
  <div className="flex md:hidden items-center justify-around">
    ...
  </div>
```

Key changes on the nav:
- `pb-[env(safe-area-inset-bottom)]` on the `nav` element itself (not a child), with `md:pb-0` to disable on desktop
- Desktop sidebar height changed from `100vh` to `100dvh` and removed safe-area-inset-top calc (simplified)
- Removed `safe-area-bottom-padding` class usage (replaced by direct Tailwind)
- Removed the filler div completely

### Why this fixes it

- `position: relative` on `#root` lets the document flow naturally to the physical screen edge
- `min-h-[100dvh]` uses the dynamic viewport height that iOS standalone mode reports correctly
- `pb-[env(safe-area-inset-bottom)]` on the nav itself extends the nav's background color through the safe area while keeping content above the home indicator
- No spacer divs needed -- the nav handles its own safe area


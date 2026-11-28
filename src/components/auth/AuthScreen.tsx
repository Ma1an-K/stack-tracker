import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { PokerChipSpade } from '@/components/icons/PokerChipSpade';

/**
 * Full-screen chrome for sign-in and first-run screens (same tokens as the rest of the app).
 * `top` replaces the brand link, e.g. with a back button and progress bar in host setup.
 */
export function AuthScreen({ eyebrow, headline, top, children }: { eyebrow?: string; headline: ReactNode; top?: ReactNode; children: ReactNode }) {
  return (
    <div className="fixed inset-0 overflow-y-auto bg-background">
      <div aria-hidden="true" className="pointer-events-none fixed -left-28 -top-28 h-[460px] w-[460px] rounded-full bg-[radial-gradient(circle,hsl(var(--gold)/0.12)_0%,transparent_65%)]" />
      <div aria-hidden="true" className="pointer-events-none fixed -right-24 bottom-0 h-[360px] w-[360px] rounded-full bg-[radial-gradient(circle,hsl(var(--gold)/0.06)_0%,transparent_65%)]" />
      <main className="relative mx-auto flex min-h-full w-full max-w-sm flex-col px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[calc(env(safe-area-inset-top)+2.5rem)] page-enter">
        {top ?? (
          <Link to="/" className="mb-10 flex items-center gap-2.5 self-start rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Stack Tracker home">
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-gold/40 bg-card shadow-[0_0_24px_-6px_hsl(var(--gold)/0.6)]">
              <PokerChipSpade className="h-5 w-5 text-gold" />
            </span>
            <span className="text-[0.75rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Stack Tracker</span>
          </Link>
        )}
        {eyebrow && <p className="section-header mb-2">{eyebrow}</p>}
        <h1 className="font-display text-[2.6rem] font-semibold leading-[1.02] text-foreground">{headline}</h1>
        <div aria-hidden="true" className="gold-hairline mb-8 mt-6 h-px w-24 bg-left" />
        <div className="flex flex-1 flex-col">{children}</div>
      </main>
    </div>
  );
}

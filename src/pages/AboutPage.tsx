import { Link } from 'react-router-dom';
import { usePageMeta } from '@/hooks/usePageMeta';

const TITLE = 'About Stack Tracker – Poker Homegame Manager';
const DESCRIPTION = 'Stack Tracker is a free, independent web app for tracking home poker games. Built by a home-game host, for home-game hosts.';
const CANONICAL = 'https://www.stack-tracker.com/about';

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'AboutPage',
  url: CANONICAL,
  name: TITLE,
  description: DESCRIPTION,
  isPartOf: {
    '@type': 'WebSite',
    name: 'Stack Tracker',
    url: 'https://www.stack-tracker.com/',
  },
};

export function AboutPage() {
  usePageMeta({
    title: TITLE,
    description: DESCRIPTION,
    canonical: CANONICAL,
    jsonLd: JSON_LD,
  });

  return (
    <div className="min-h-dvh bg-background text-foreground overflow-x-hidden">
      <div
        className="pointer-events-none fixed -top-24 -left-16 w-[380px] h-[380px] z-0"
        style={{ background: 'radial-gradient(circle, rgba(200,155,60,0.10) 0%, transparent 65%)' }}
      />

      <header className="relative z-10 px-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="max-w-3xl mx-auto flex items-center justify-between py-3">
          <Link to="/" className="flex items-center gap-2">
            <img
              src="/icon-192x192.png"
              alt="Stack Tracker logo"
              className="w-8 h-8 rounded-lg shadow-[0_0_12px_rgba(200,155,60,0.45)]"
            />
            <span className="font-bold tracking-tight">Stack Tracker</span>
          </Link>
          <Link
            to="/auth"
            className="text-sm font-medium text-gold hover:underline underline-offset-4"
          >
            Sign In
          </Link>
        </div>
      </header>

      <main className="relative z-10 px-[max(1.25rem,env(safe-area-inset-left))] pr-[max(1.25rem,env(safe-area-inset-right))] pt-6 pb-20">
        <article className="max-w-2xl mx-auto prose-style">
          <p className="text-[11px] uppercase tracking-[0.2em] text-gold/80 font-semibold mb-3">
            About
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold leading-[1.1] tracking-tight mb-6">
            Built for the people running the game.
          </h1>

          <div className="space-y-5 text-base leading-relaxed text-foreground/90">
            <p>
              Stack Tracker started where most home-game tools start — with a
              spreadsheet, a WhatsApp thread, and someone always saying
              "wait, I think you're wrong about who owes who". After enough
              Sunday-morning re-counts, that was reason enough to build
              something better.
            </p>

            <p>
              The result is Stack Tracker: a free web app for managing private
              poker homegames. You log every session — buy-ins, rebuys, final
              cash-outs — and Stack Tracker handles the bookkeeping. Settlements
              are calculated automatically with the smallest possible number
              of transfers. Lifetime stats, leaderboards and badges are
              tracked for every player across every session. It works on
              your phone as a Progressive Web App, no install required.
            </p>

            <h2 className="text-xl font-bold tracking-tight pt-4">What we believe</h2>

            <ul className="space-y-3 list-none pl-0">
              <li className="flex gap-3">
                <span className="text-gold mt-1">•</span>
                <span>
                  <strong>Home-game tools should be free.</strong> No ads, no
                  paywalls, no upsells. Stack Tracker is funded out of pocket
                  and that's the plan.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-gold mt-1">•</span>
                <span>
                  <strong>Your homegame is private.</strong> Every game is
                  invite-only. Members of one game can't see the sessions,
                  standings, or stats of any other game. Your data isn't sold,
                  shared, or used for anything except running your homegame.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-gold mt-1">•</span>
                <span>
                  <strong>The game is the point.</strong> Stack Tracker is
                  designed to be the thing you open for ninety seconds at the
                  end of the night, not a piece of software that demands your
                  attention.
                </span>
              </li>
            </ul>

            <h2 className="text-xl font-bold tracking-tight pt-4">Get in touch</h2>
            <p>
              Have feedback, found a bug, or want a feature? Reach out — every
              message gets read. The fastest way to influence the roadmap is
              still telling us what's broken or missing for your game.
            </p>
          </div>

          <div className="mt-12 rounded-2xl border border-[rgba(200,155,60,0.25)] bg-card/40 p-6 sm:p-8 text-center">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-2">
              Try it for your next session
            </h2>
            <p className="text-muted-foreground mb-5 text-sm sm:text-base">
              Free forever. Setup takes under a minute.
            </p>
            <Link
              to="/auth"
              className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-gold text-background font-semibold min-h-[48px] shadow-[0_6px_22px_rgba(200,155,60,0.45)] hover:bg-gold/90 transition-colors"
            >
              Get Started — Free
            </Link>
          </div>
        </article>
      </main>

      <footer className="relative z-10 px-[max(1.25rem,env(safe-area-inset-left))] pr-[max(1.25rem,env(safe-area-inset-right))] py-8 border-t border-[rgba(200,155,60,0.18)] pb-[max(2rem,env(safe-area-inset-bottom))]">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <Link to="/" className="flex items-center gap-2 hover:text-foreground transition-colors">
            <img
              src="/icon-192x192.png"
              alt=""
              aria-hidden="true"
              className="w-5 h-5 rounded"
            />
            <span>Stack Tracker — Poker Homegame Manager</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              to="/poker-settlement-calculator"
              className="hover:text-foreground transition-colors"
            >
              Settlement Calculator
            </Link>
            <Link to="/auth" className="hover:text-foreground transition-colors">
              Sign In
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

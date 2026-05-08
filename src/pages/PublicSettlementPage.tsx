import { Link } from 'react-router-dom';
import { PublicSettlementCalculator } from '@/components/calculator/PublicSettlementCalculator';
import { usePageMeta } from '@/hooks/usePageMeta';
import {
  MarketingNavbar,
  btnGold,
  goldGradient,
} from '@/components/layout/MarketingNavbar';

const TITLE = 'Poker Settlement Calculator – Free, No Signup | Stack Tracker';
const DESCRIPTION = 'Free poker settlement calculator. Enter each player\'s buy-ins and cash-outs and get the minimum number of payments to settle your home game. No signup required.';
const CANONICAL = 'https://www.stack-tracker.com/poker-settlement-calculator';

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Poker Settlement Calculator',
  url: CANONICAL,
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'Web',
  description: DESCRIPTION,
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  isPartOf: {
    '@type': 'WebSite',
    name: 'Stack Tracker',
    url: 'https://www.stack-tracker.com/',
  },
};

export function PublicSettlementPage() {
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

      <MarketingNavbar />

      <main className="relative z-10 px-[max(1.25rem,env(safe-area-inset-left))] pr-[max(1.25rem,env(safe-area-inset-right))] pt-28 pb-20">
        <div className="max-w-3xl mx-auto">
          <p className="text-[11px] uppercase tracking-[0.2em] text-gold/80 font-semibold mb-3">
            Free tool — No signup
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold leading-[1.1] tracking-tight mb-4">
            Poker <span className={goldGradient}>Settlement</span> Calculator
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground mb-8 leading-relaxed">
            Enter every player's buy-ins and cash-outs and we'll work out the
            minimum number of payments to settle your home poker game. No
            account, no install, free forever.
          </p>

          <PublicSettlementCalculator />

          <section className="mt-16 space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-3">
                How the settlement calculator works
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Settling up after a home poker game is a small graph
                optimisation problem. Each player has a net result — they're
                either up money (a winner) or down money (a loser). The total
                amount the losers owe is exactly the total amount the winners
                are due. The question is: what is the smallest set of payments
                that makes everyone whole?
              </p>
              <p className="text-muted-foreground leading-relaxed mt-3">
                Stack Tracker pairs the biggest loser with the biggest winner,
                transfers as much as possible between them, and repeats. For
                a six-player game that usually means 2–3 payments instead of
                everyone paying everyone else.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-3">
                Why does this matter?
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                In a typical home game, six players each settling
                individually would mean up to fifteen separate payments. With
                an optimised settlement, the same night usually closes out in
                two or three. Fewer transfers = less chance of someone forgetting
                to pay, fewer Venmo round-trips, and no awkward "wait, I owe
                you how much?" the next morning.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-3">Frequently asked questions</h2>
              <div className="space-y-5">
                <div>
                  <h3 className="font-semibold mb-1">
                    Do the buy-ins and cash-outs need to add up exactly?
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Yes — for a clean settlement the total buy-ins should equal
                    the total cash-outs. If they don't, the calculator shows a
                    warning so you can find the missing chips before settling.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">
                    Does this work for tournaments and cash games?
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Both. For tournaments, the buy-in is the entry fee and the
                    cash-out is the prize (or zero if they busted). For cash
                    games, total all rebuys into the buy-in and use the final
                    chip stack value as the cash-out.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Is my data saved anywhere?</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    No. This calculator runs entirely in your browser. Nothing
                    is sent to a server and nothing is stored. If you want to
                    track sessions over time, leaderboards, and player stats
                    across your homegame,{' '}
                    <Link to="/auth" className="text-gold hover:underline">
                      create a free Stack Tracker account
                    </Link>
                    .
                  </p>
                </div>
              </div>
            </div>
          </section>

          <div className="mt-16 rounded-2xl border border-[rgba(200,155,60,0.25)] bg-gradient-to-br from-card/60 to-background/40 p-6 sm:p-8 text-center">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-2">
              Run a regular poker night?
            </h2>
            <p className="text-muted-foreground mb-5 max-w-md mx-auto text-sm sm:text-base">
              Stack Tracker remembers your players, tracks lifetime profit, and
              keeps a leaderboard across every session. Free — no card required.
            </p>
            <Link to="/auth" className={btnGold}>
              Start tracking your homegame
            </Link>
          </div>
        </div>
      </main>

      <footer className="relative z-10 px-[max(1.25rem,env(safe-area-inset-left))] pr-[max(1.25rem,env(safe-area-inset-right))] py-8 border-t border-[rgba(200,155,60,0.18)] pb-[max(2rem,env(safe-area-inset-bottom))]">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
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
              to="/poker-hand-calculator"
              className="hover:text-foreground transition-colors"
            >
              Hand Calculator
            </Link>
            <Link to="/about" className="hover:text-foreground transition-colors">
              About
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

import { Link } from 'react-router-dom';
import { SidepotCalculator } from '@/components/calculator/SidepotCalculator';
import { usePageMeta } from '@/hooks/usePageMeta';

const TITLE = 'Poker Hand Calculator – Hold\'em, Omaha, Sidepots | Stack Tracker';
const DESCRIPTION = 'Free poker hand calculator. Enter hole cards and the board to determine winners, sidepots and run-it-twice payouts for Texas Hold\'em and Omaha. No signup.';
const CANONICAL = 'https://www.stack-tracker.com/poker-hand-calculator';

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Poker Hand Calculator',
  url: CANONICAL,
  applicationCategory: 'GameApplication',
  operatingSystem: 'Web',
  description: DESCRIPTION,
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  featureList: [
    'Texas Hold\'em hand evaluator',
    'Pot-Limit Omaha (PLO) hand evaluator',
    'Multi-way sidepot calculator',
    'Run-it-twice and run-it-thrice payouts',
    'Multiple boards on a single deck or two decks',
  ],
  isPartOf: {
    '@type': 'WebSite',
    name: 'Stack Tracker',
    url: 'https://www.stack-tracker.com/',
  },
};

export function PublicHandCalculatorPage() {
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
        <div className="max-w-6xl mx-auto flex items-center justify-between py-3">
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
        <div className="max-w-6xl mx-auto">
          <div className="max-w-3xl">
            <p className="text-[11px] uppercase tracking-[0.2em] text-gold/80 font-semibold mb-3">
              Free tool — No signup
            </p>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold leading-[1.1] tracking-tight mb-4">
              Poker Hand Calculator
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground mb-8 leading-relaxed">
              Enter the hole cards and the board, and we'll work out who
              wins, who chops, and how the sidepots split. Supports Texas
              Hold'em, Pot-Limit Omaha, multi-way all-ins, run-it-twice, and
              even two-deck home games. Runs entirely in your browser — no
              signup, no account, no data sent anywhere.
            </p>
          </div>

          <div className="rounded-2xl border border-[rgba(200,155,60,0.18)] bg-card/40 backdrop-blur-sm p-5 sm:p-6 mb-12">
            <SidepotCalculator />
          </div>

          <section className="max-w-3xl space-y-10">
            <div>
              <h2 className="text-2xl font-bold mb-3">
                What this calculator does
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Every player gets hole cards. The dealer puts a board out.
                Our evaluator scores each player's best 5-card hand
                (following the right rules for the chosen game), figures out
                who wins outright versus who chops, and then walks the
                sidepots based on each player's stack and all-in status.
                When you run it twice or three times, each run pays out its
                own share of the pot.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-3">Texas Hold'em rules used</h2>
              <p className="text-muted-foreground leading-relaxed">
                A player makes the best 5-card hand from any combination of
                their two hole cards and the five community cards. They can
                use both hole cards, one, or play the board. Hand rankings
                follow standard high-poker order: straight flush, four of a
                kind, full house, flush, straight, three of a kind, two
                pair, one pair, high card.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-3">
                Pot-Limit Omaha (PLO) rules used
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Each player gets four hole cards and{' '}
                <strong>must use exactly two of them</strong> combined with
                exactly three board cards to make their best 5-card hand —
                that's the rule that catches new PLO players out. The
                calculator enforces this automatically, so the "nut flush"
                with one suited card in your hand is not a flush at all.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-3">
                How sidepots are calculated
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                When players go all-in for different amounts, the pot
                splits into a main pot (which everyone is eligible for) and
                one or more sidepots (which only the players with deeper
                stacks contest). The calculator orders all-ins by stack
                size, builds each pot layer by layer, and awards each layer
                to the eligible winners. If you've ever lost a hand and
                still got paid out of the main pot, that's why.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-3">Frequently asked questions</h2>
              <div className="space-y-5">
                <div>
                  <h3 className="font-semibold mb-1">
                    Does this work pre-flop or only at showdown?
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    The calculator works once the board has at least a
                    flop. It's a hand-resolution / sidepot tool, not a
                    pre-flop equity simulator. For an all-in pre-flop with
                    no board, leave the flop empty — when you fill in
                    cards, the winner updates live.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">
                    Can I add more than two boards (run it three times)?
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Yes. Add as many boards as you want. The pot splits
                    evenly across them, and ties on a single board are
                    chopped within that board.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">
                    What's "2 decks" mode for?
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Some home games run with two decks shuffled together to
                    speed up dealing across multiple boards. With two-deck
                    mode on, each card can appear up to twice across hole
                    cards and boards — useful for accurate run-it-twice
                    calculations when the same flop card needs to repeat.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Is anything saved?</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    No. The whole calculation runs in your browser. Nothing
                    is stored, nothing is sent to a server. If you want to
                    track sessions, settlements, and stats over time across
                    your homegame,{' '}
                    <Link to="/auth" className="text-gold hover:underline">
                      sign up for Stack Tracker
                    </Link>
                    .
                  </p>
                </div>
              </div>
            </div>
          </section>

          <div className="mt-16 max-w-3xl rounded-2xl border border-[rgba(200,155,60,0.25)] bg-gradient-to-br from-card/60 to-background/40 p-6 sm:p-8 text-center">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-2">
              Run a regular poker night?
            </h2>
            <p className="text-muted-foreground mb-5 max-w-md mx-auto text-sm sm:text-base">
              Stack Tracker remembers your players, tracks lifetime profit, and
              keeps a leaderboard across every session. Free — no card required.
            </p>
            <Link
              to="/auth"
              className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-gold text-background font-semibold min-h-[48px] shadow-[0_6px_22px_rgba(200,155,60,0.45)] hover:bg-gold/90 transition-colors"
            >
              Start tracking your homegame
            </Link>
          </div>
        </div>
      </main>

      <footer className="relative z-10 px-[max(1.25rem,env(safe-area-inset-left))] pr-[max(1.25rem,env(safe-area-inset-right))] py-8 border-t border-[rgba(200,155,60,0.18)] pb-[max(2rem,env(safe-area-inset-bottom))]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
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

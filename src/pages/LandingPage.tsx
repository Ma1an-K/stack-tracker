import { Link } from 'react-router-dom';
import {
  Calendar,
  Calculator,
  Trophy,
  Users,
  BarChart3,
  Award,
  Smartphone,
  ShieldCheck,
} from 'lucide-react';

const features = [
  {
    icon: Calendar,
    title: 'Session Tracker',
    body: 'Log every buy-in, rebuy and cash-out. Every home poker night is saved to your game\u2019s history with dates, players and results.',
  },
  {
    icon: Calculator,
    title: 'Automatic Settlements',
    body: 'Our settlement calculator works out who owes whom in the fewest possible transfers. No more arguing at 2 a.m. over who owes who.',
  },
  {
    icon: Trophy,
    title: 'Leaderboards & Standings',
    body: 'Homegame standings ranked by profit, ROI and sessions played. See where you sit against the regulars in your game.',
  },
  {
    icon: BarChart3,
    title: 'Personal Poker Stats',
    body: 'Lifetime profit, per-session averages, biggest wins and losses, and trends over time for every player.',
  },
  {
    icon: Award,
    title: 'Badges & Achievements',
    body: 'Heaters, cold streaks, tournament wins and more. Keep your homegame fun with unlockable badges that track real performance.',
  },
  {
    icon: Users,
    title: 'Private Homegames',
    body: 'Invite-only games with shareable codes. Owners and admins manage members, sessions and permissions.',
  },
  {
    icon: Smartphone,
    title: 'Installable PWA',
    body: 'Add Stack Tracker to your iPhone or Android home screen and it runs like a native app — offline-friendly and full-screen.',
  },
  {
    icon: ShieldCheck,
    title: 'Your Data, Private',
    body: 'Each homegame is isolated. Only invited members can see the sessions, results and standings of your private poker game.',
  },
];

const steps = [
  {
    n: '1',
    title: 'Create a homegame',
    body: 'Name your poker night, pick an icon, and you\u2019re ready. Free forever, no card required.',
  },
  {
    n: '2',
    title: 'Invite your players',
    body: 'Share an invite code with your regulars. They sign up, join your game, and appear on the leaderboard.',
  },
  {
    n: '3',
    title: 'Log sessions, settle debts',
    body: 'After the game, enter buy-ins and cash-outs. Stack Tracker calculates who pays whom — instantly.',
  },
];

export function LandingPage() {
  return (
    <div className="min-h-dvh bg-background text-foreground overflow-x-hidden">
      {/* Ambient gold glows */}
      <div
        className="pointer-events-none fixed -top-20 -left-20 w-[380px] h-[380px] z-0"
        style={{ background: 'radial-gradient(circle, rgba(200,155,60,0.10) 0%, transparent 65%)' }}
      />
      <div
        className="pointer-events-none fixed bottom-10 -right-16 w-[300px] h-[300px] z-0"
        style={{ background: 'radial-gradient(circle, rgba(200,155,60,0.06) 0%, transparent 65%)' }}
      />

      {/* Top nav */}
      <header className="relative z-10 px-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="max-w-6xl mx-auto flex items-center justify-between py-3">
          <div className="flex items-center gap-2">
            <img
              src="/icon-192x192.png"
              alt="Stack Tracker logo"
              className="w-8 h-8 rounded-lg shadow-[0_0_12px_rgba(200,155,60,0.45)]"
            />
            <span className="font-bold tracking-tight">Stack Tracker</span>
          </div>
          <Link
            to="/auth"
            className="text-sm font-medium text-gold hover:underline underline-offset-4"
          >
            Sign In
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 px-[max(1.25rem,env(safe-area-inset-left))] pr-[max(1.25rem,env(safe-area-inset-right))] pt-8 pb-16 md:pt-16 md:pb-24">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-[11px] uppercase tracking-[0.2em] text-gold/80 font-semibold mb-4">
            Poker Homegame Manager
          </p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-[1.05] tracking-tight mb-5">
            Track every hand.
            <br />
            <span className="text-gold">Settle every debt.</span>
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto mb-8 leading-relaxed">
            Stack Tracker is the all-in-one manager for your home poker night. Log
            sessions, calculate settlements, and track leaderboards, stats and badges
            for every player in your private homegame.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-stretch sm:items-center max-w-sm sm:max-w-none mx-auto">
            <Link
              to="/auth"
              className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-gold text-background font-semibold min-h-[48px] shadow-[0_6px_22px_rgba(200,155,60,0.45)] hover:bg-gold/90 transition-colors"
            >
              Get Started — Free
            </Link>
            <a
              href="#features"
              className="inline-flex items-center justify-center px-6 py-3 rounded-lg border border-gold/30 text-gold font-semibold min-h-[48px] hover:bg-gold/10 transition-colors"
            >
              See How It Works
            </a>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            No credit card. No ads. Install on iPhone or Android.
          </p>
        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        className="relative z-10 px-[max(1.25rem,env(safe-area-inset-left))] pr-[max(1.25rem,env(safe-area-inset-right))] py-12 md:py-20 border-t border-[rgba(200,155,60,0.18)]"
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10 md:mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
              Everything your homegame needs
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Built for private poker games — friendly groups, weekly sessions,
              and the people who run them.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((f) => (
              <div
                key={f.title}
                className="p-5 rounded-xl border border-[rgba(200,155,60,0.18)] bg-card/40 backdrop-blur-sm"
              >
                <div className="w-10 h-10 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center mb-4">
                  <f.icon className="h-5 w-5 text-gold" />
                </div>
                <h3 className="font-semibold mb-1.5">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="relative z-10 px-[max(1.25rem,env(safe-area-inset-left))] pr-[max(1.25rem,env(safe-area-inset-right))] py-12 md:py-20 border-t border-[rgba(200,155,60,0.18)]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
              Running your poker night in 3 steps
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              From first buy-in to final settlement — Stack Tracker handles the
              bookkeeping so you can focus on the cards.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {steps.map((s) => (
              <div
                key={s.n}
                className="p-6 rounded-xl border border-[rgba(200,155,60,0.18)] bg-card/40"
              >
                <div className="w-9 h-9 rounded-full bg-gold text-background font-bold flex items-center justify-center mb-4 shadow-[0_4px_16px_rgba(200,155,60,0.4)]">
                  {s.n}
                </div>
                <h3 className="font-semibold mb-1.5">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ / SEO content */}
      <section className="relative z-10 px-[max(1.25rem,env(safe-area-inset-left))] pr-[max(1.25rem,env(safe-area-inset-right))] py-12 md:py-20 border-t border-[rgba(200,155,60,0.18)]">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-6">
            Frequently asked questions
          </h2>
          <div className="space-y-5">
            <div>
              <h3 className="font-semibold mb-1">Is Stack Tracker free?</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Yes — Stack Tracker is completely free for players and homegame
                owners. No subscriptions, no ads, no card required.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-1">Do I need to install anything?</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                No. It works in any modern browser on iPhone, Android, Mac or PC.
                You can optionally install it as a PWA on your home screen for a
                full-screen, app-like experience.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-1">How does the settlement calculator work?</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                After a session, enter each player\u2019s total buy-ins and final
                stack. Stack Tracker figures out who owes whom with the minimum
                number of transfers — so instead of six people paying six
                others, you might only need two payments to settle everything.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-1">Can I run multiple homegames?</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Absolutely. Each homegame has its own members, sessions, leaderboard
                and stats. Switch between them from the header menu.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-1">Is my data private?</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Yes. Homegames are invite-only — only the people with your
                invite code can see the sessions, standings and settlements for your
                private poker game.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 px-[max(1.25rem,env(safe-area-inset-left))] pr-[max(1.25rem,env(safe-area-inset-right))] py-14 md:py-20 border-t border-[rgba(200,155,60,0.18)]">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Ready to run your best homegame yet?
          </h2>
          <p className="text-muted-foreground mb-7">
            Free forever for players and organisers. Setup takes under a minute.
          </p>
          <Link
            to="/auth"
            className="inline-flex items-center justify-center px-8 py-4 rounded-lg bg-gold text-background font-semibold text-base min-h-[52px] shadow-[0_6px_22px_rgba(200,155,60,0.45)] hover:bg-gold/90 transition-colors"
          >
            Get Started
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-[max(1.25rem,env(safe-area-inset-left))] pr-[max(1.25rem,env(safe-area-inset-right))] py-8 border-t border-[rgba(200,155,60,0.18)] pb-[max(2rem,env(safe-area-inset-bottom))]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <img
              src="/icon-192x192.png"
              alt=""
              aria-hidden="true"
              className="w-5 h-5 rounded"
            />
            <span>Stack Tracker — Poker Homegame Manager</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/auth" className="hover:text-foreground transition-colors">
              Sign In
            </Link>
            <Link to="/auth" className="hover:text-foreground transition-colors">
              Create Account
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

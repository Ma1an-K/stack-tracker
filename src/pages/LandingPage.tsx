import { useEffect, useRef, useState } from 'react';
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
  ArrowRight,
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  MarketingNavbar,
  btnGold,
  btnGoldOutline,
  goldDivider,
  goldGradient,
} from '@/components/layout/MarketingNavbar';

/* ---------- shared style tokens (kept inline to avoid global CSS edits) ---------- */

const display = 'font-[family-name:Playfair_Display,Georgia,serif]';
const eyebrow =
  'inline-flex items-center gap-2 text-gold text-[11px] font-semibold tracking-[0.22em] uppercase';
const glassCard =
  'rounded-xl border border-[rgba(200,155,60,0.16)] bg-[rgba(20,24,38,0.55)] backdrop-blur-md transition-[border-color,box-shadow,transform] duration-300 hover:border-[rgba(200,155,60,0.34)] hover:shadow-[0_8px_40px_-12px_rgba(200,155,60,0.25)]';

/* ---------- in-view hook (SSR-safe) ---------- */

function useInView<T extends HTMLElement>(rootMargin = '-80px') {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (!ref.current || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const el = ref.current;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setInView(true);
            io.disconnect();
          }
        }
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);
  return { ref, inView };
}

/* ---------- data ---------- */

const features = [
  {
    icon: Calendar,
    title: 'Session Tracker',
    body: 'Log every buy-in, rebuy and cash-out. Every home poker night is saved with dates, players and results.',
  },
  {
    icon: Calculator,
    title: 'Automatic Settlements',
    body: 'Our settlement calculator works out who owes whom in the fewest possible transfers. No more arguing at 2 a.m.',
  },
  {
    icon: Trophy,
    title: 'Leaderboards & Standings',
    body: 'Homegame standings ranked by profit, ROI and sessions played. See where you sit against the regulars.',
  },
  {
    icon: BarChart3,
    title: 'Personal Poker Stats',
    body: 'Lifetime profit, per-session averages, biggest wins and losses, and trends over time for every player.',
  },
  {
    icon: Award,
    title: 'Badges & Achievements',
    body: 'Heaters, cold streaks, tournament wins and more. Keep your homegame fun with unlockable badges.',
  },
  {
    icon: Users,
    title: 'Private Homegames',
    body: 'Invite-only games with shareable codes. Owners and admins manage members, sessions and permissions.',
  },
  {
    icon: Smartphone,
    title: 'Installable PWA',
    body: 'Add Stack Tracker to your home screen and it runs like a native app — offline-friendly and full-screen.',
  },
  {
    icon: ShieldCheck,
    title: 'Your Data, Private',
    body: 'Each homegame is isolated. Only invited members can see the sessions, results and standings.',
  },
];

const steps = [
  {
    n: '01',
    title: 'Create a homegame',
    body: 'Name your poker night, pick an icon, and you’re ready. Free forever, no card required.',
  },
  {
    n: '02',
    title: 'Invite your players',
    body: 'Share an invite code with your regulars. They sign up, join your game, and appear on the leaderboard.',
  },
  {
    n: '03',
    title: 'Log sessions, settle debts',
    body: 'After the game, enter buy-ins and cash-outs. Stack Tracker calculates who pays whom — instantly.',
  },
];

const faqs = [
  {
    q: 'Is Stack Tracker free?',
    a: 'Yes — Stack Tracker is completely free for players and homegame owners. No subscriptions, no ads, no card required.',
  },
  {
    q: 'Do I need to install anything?',
    a: 'No. It works in any modern browser on iPhone, Android, Mac or PC. You can optionally install it as a PWA on your home screen for a full-screen, app-like experience.',
  },
  {
    q: 'How does the settlement calculator work?',
    a: 'After a session, enter each player’s total buy-ins and final stack. Stack Tracker figures out who owes whom with the minimum number of transfers — so instead of six people paying six others, you might only need two payments to settle everything.',
  },
  {
    q: 'Can I run multiple homegames?',
    a: 'Absolutely. Each homegame has its own members, sessions, leaderboard and stats. Switch between them from the header menu.',
  },
  {
    q: 'Is my data private?',
    a: 'Yes. Homegames are invite-only — only the people with your invite code can see the sessions, standings and settlements for your private poker game.',
  },
];

/* ---------- subcomponents ---------- */

/* Hero phone mockup — app screenshot inside a CSS iPhone-style frame,
   with a slight 3D tilt and a soft gold radial glow for ambient lift. */
function PhoneMockup() {
  return (
    <div className="relative w-full flex justify-center lg:justify-end">
      {/* Gold ambient glow behind the phone */}
      <div
        aria-hidden
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[460px] h-[460px] rounded-full opacity-40 blur-3xl pointer-events-none"
        style={{
          background:
            'radial-gradient(circle, rgba(200,155,60,0.5) 0%, transparent 65%)',
        }}
      />
      <div
        className="relative z-10 w-[210px] sm:w-[240px] lg:w-[275px]"
        style={{
          transform: 'perspective(1300px) rotateY(-22deg) rotateX(5deg)',
          transformOrigin: 'center center',
        }}
      >
        {/* Outer metallic frame */}
        <div className="relative rounded-[3rem] p-[3px] bg-gradient-to-br from-[#4a4a4a] via-[#1a1a1a] to-[#050505] shadow-[40px_50px_90px_-25px_rgba(0,0,0,0.75)] ring-1 ring-[rgba(255,255,255,0.05)]">
          {/* Inner black bezel */}
          <div className="rounded-[2.82rem] p-[7px] bg-[#080808]">
            {/* Screen */}
            <div className="relative rounded-[2.3rem] overflow-hidden bg-black">
              <img
                src="/landing/app-screenshot.png"
                alt="Stack Tracker app showing homegame dashboard with sessions and lifetime profit"
                loading="eager"
                decoding="async"
                className="block w-full"
              />
              {/* Dynamic Island */}
              <div
                aria-hidden
                className="absolute top-[2.4%] left-1/2 -translate-x-1/2 w-[32%] h-[3.2%] bg-black rounded-full ring-1 ring-[rgba(255,255,255,0.06)]"
              />
            </div>
          </div>
          {/* Side button silhouettes */}
          <div
            aria-hidden
            className="absolute -left-[3px] top-[18%] w-[3px] h-[6%] rounded-l-sm bg-gradient-to-r from-[#1a1a1a] to-[#3a3a3a]"
          />
          <div
            aria-hidden
            className="absolute -left-[3px] top-[28%] w-[3px] h-[10%] rounded-l-sm bg-gradient-to-r from-[#1a1a1a] to-[#3a3a3a]"
          />
          <div
            aria-hidden
            className="absolute -left-[3px] top-[40%] w-[3px] h-[10%] rounded-l-sm bg-gradient-to-r from-[#1a1a1a] to-[#3a3a3a]"
          />
          <div
            aria-hidden
            className="absolute -right-[3px] top-[26%] w-[3px] h-[14%] rounded-r-sm bg-gradient-to-l from-[#1a1a1a] to-[#3a3a3a]"
          />
        </div>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section className="relative min-h-[100svh] lg:min-h-screen flex items-center overflow-hidden pt-24 pb-16 lg:pt-32 lg:pb-24">
      {/* Backdrop layers */}
      <div aria-hidden className="absolute inset-0 -z-10">
        {/* Cinematic background image */}
        <img
          src="/landing/hero-bg.webp"
          alt=""
          loading="eager"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover opacity-55"
        />
        {/* Left-to-right dark gradient (keeps copy readable) */}
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-transparent" />
        {/* Top + bottom vertical gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-transparent to-background" />
        {/* Center gold accent pool */}
        <div
          className="absolute top-1/3 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[760px] h-[760px] rounded-full opacity-[0.18] blur-3xl"
          style={{
            background:
              'radial-gradient(circle, rgba(200,155,60,0.45) 0%, transparent 65%)',
          }}
        />
      </div>

      <div className="relative z-10 max-w-[1280px] w-full mx-auto px-5 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-[1fr_0.85fr] gap-12 lg:gap-12 items-center">
          {/* LEFT — copy */}
          <div className="max-w-2xl">
            <div className="opacity-0 animate-[fade-in_0.7s_ease-out_0.05s_forwards]">
              <span className={eyebrow + ' mb-6'}>
                <span className="w-7 h-px bg-gold/80" />
                Poker Homegame Manager
              </span>
            </div>

            <h1
              className={`${display} text-foreground text-[44px] sm:text-6xl lg:text-7xl font-bold leading-[1.04] tracking-tight mb-6`}
            >
              <span className="block opacity-0 animate-[slide-up_0.7s_cubic-bezier(0.4,0,0.2,1)_0.15s_forwards]">
                Track every hand.
              </span>
              <span
                className={`block ${goldGradient} opacity-0 animate-[slide-up_0.7s_cubic-bezier(0.4,0,0.2,1)_0.3s_forwards]`}
              >
                Settle every debt.
              </span>
            </h1>

            <p className="opacity-0 animate-[slide-up_0.7s_cubic-bezier(0.4,0,0.2,1)_0.45s_forwards] text-foreground/55 text-lg lg:text-xl leading-relaxed max-w-xl mb-9">
              The all-in-one manager for your home poker night. Log sessions,
              calculate settlements, and track leaderboards, stats and badges
              for every player in your private homegame.
            </p>

            <div className="opacity-0 animate-[slide-up_0.7s_cubic-bezier(0.4,0,0.2,1)_0.6s_forwards] flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6">
              <Link to="/auth" className={`${btnGold} text-base px-7 py-3.5`}>
                Get Started — Free
                <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
              </Link>
              <a
                href="#how-it-works"
                className={`${btnGoldOutline} text-base px-7 py-3.5`}
              >
                See How It Works
              </a>
            </div>

            <p className="opacity-0 animate-[fade-in_0.7s_ease-out_0.85s_forwards] text-foreground/35 text-sm">
              No credit card. No ads. Install on iPhone or Android.
            </p>
          </div>

          {/* RIGHT — phone mockup */}
          <div className="opacity-0 animate-[fade-in_1s_ease-out_0.55s_forwards] mt-4 lg:mt-0">
            <PhoneMockup />
          </div>
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  body,
  delay,
}: {
  icon: typeof Calendar;
  title: string;
  body: string;
  delay: number;
}) {
  const { ref, inView } = useInView<HTMLDivElement>('-60px');
  return (
    <div
      ref={ref}
      className={`${glassCard} group p-6 lg:p-7 ${
        inView
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-6'
      } transition-[opacity,transform] duration-700`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="w-11 h-11 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center mb-5 group-hover:bg-gold/15 group-hover:border-gold/35 transition-colors duration-300">
        <Icon className="w-5 h-5 text-gold" strokeWidth={1.6} />
      </div>
      <h3 className="text-foreground font-semibold text-base mb-2.5 tracking-tight">
        {title}
      </h3>
      <p className="text-foreground/45 text-sm leading-relaxed">{body}</p>
    </div>
  );
}

function Features() {
  return (
    <section id="features" className="relative py-24 lg:py-32 overflow-hidden">
      <div className="absolute inset-x-0 top-0">
        <div className={goldDivider} />
      </div>

      {/* Subtle textured background */}
      <div aria-hidden className="absolute inset-0 -z-10">
        <img
          src="/landing/features-bg.webp"
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover opacity-25"
        />
        <div className="absolute inset-0 bg-background/65" />
      </div>

      <div className="relative max-w-[1280px] mx-auto px-5 sm:px-6 lg:px-8">
        <div className="text-center mb-14 lg:mb-20">
          <span className={`${eyebrow} mb-4`}>
            <span className="w-6 h-px bg-gold/80" />
            Features
            <span className="w-6 h-px bg-gold/80" />
          </span>
          <h2
            className={`${display} text-foreground text-4xl sm:text-5xl lg:text-[3.25rem] font-bold tracking-tight mb-5 mt-4`}
          >
            Everything your homegame needs
          </h2>
          <p className="text-foreground/55 text-lg max-w-2xl mx-auto leading-relaxed">
            Built for private poker games — friendly groups, weekly sessions,
            and the people who run them.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
          {features.map((f, i) => (
            <FeatureCard
              key={f.title}
              icon={f.icon}
              title={f.title}
              body={f.body}
              delay={i * 70}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function StepRow({
  n,
  title,
  body,
  isLast,
  index,
}: {
  n: string;
  title: string;
  body: string;
  isLast: boolean;
  index: number;
}) {
  const { ref, inView } = useInView<HTMLDivElement>('-80px');
  return (
    <div
      ref={ref}
      className={`relative flex gap-6 lg:gap-10 mb-12 last:mb-0 ${
        inView ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
      } transition-[opacity,transform] duration-700`}
      style={{ transitionDelay: `${index * 120}ms` }}
    >
      <div className="flex flex-col items-center shrink-0">
        <div className="relative">
          {/* Oversized translucent numeral */}
          <span
            aria-hidden
            className={`${display} pointer-events-none select-none absolute -top-5 -left-5 text-[88px] lg:text-[110px] font-bold text-gold/[0.06] leading-none`}
          >
            {n}
          </span>
          <div className="relative z-10 w-14 h-14 rounded-full border-2 border-gold/40 bg-background flex items-center justify-center shadow-[0_0_24px_-4px_rgba(200,155,60,0.4)]">
            <span className={`${display} text-gold text-lg font-bold`}>{n}</span>
          </div>
        </div>
        {!isLast && (
          <div className="w-px flex-1 mt-3 min-h-[60px] bg-gradient-to-b from-gold/35 to-transparent" />
        )}
      </div>
      <div className="pt-2.5">
        <h3
          className={`${display} text-foreground text-2xl lg:text-[28px] font-bold tracking-tight mb-2.5`}
        >
          {title}
        </h3>
        <p className="text-foreground/55 text-base lg:text-lg leading-relaxed max-w-lg">
          {body}
        </p>
      </div>
    </div>
  );
}

function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-24 lg:py-32 overflow-hidden">
      <div className="absolute inset-x-0 top-0">
        <div className={goldDivider} />
      </div>

      {/* Background gold bloom */}
      <div
        aria-hidden
        className="absolute top-0 right-0 w-[560px] h-[560px] rounded-full opacity-[0.08] blur-3xl pointer-events-none"
        style={{
          background:
            'radial-gradient(circle, rgba(200,155,60,0.5) 0%, transparent 70%)',
        }}
      />

      <div className="relative max-w-[1280px] mx-auto px-5 sm:px-6 lg:px-8">
        <div className="text-center mb-16 lg:mb-20">
          <span className={`${eyebrow} mb-4`}>
            <span className="w-6 h-px bg-gold/80" />
            How It Works
            <span className="w-6 h-px bg-gold/80" />
          </span>
          <h2
            className={`${display} text-foreground text-4xl sm:text-5xl lg:text-[3.25rem] font-bold tracking-tight mb-5 mt-4`}
          >
            Running your poker night in 3 steps
          </h2>
          <p className="text-foreground/55 text-lg max-w-2xl mx-auto leading-relaxed">
            From first buy-in to final settlement — Stack Tracker handles the
            bookkeeping so you can focus on the cards.
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          {steps.map((s, i) => (
            <StepRow
              key={s.n}
              n={s.n}
              title={s.title}
              body={s.body}
              isLast={i === steps.length - 1}
              index={i}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  return (
    <section id="faq" className="relative py-24 lg:py-32">
      <div className="absolute inset-x-0 top-0">
        <div className={goldDivider} />
      </div>

      <div className="relative max-w-[1280px] mx-auto px-5 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-[0.42fr_0.58fr] gap-10 lg:gap-20">
          <div>
            <span className={`${eyebrow} mb-4`}>
              <span className="w-6 h-px bg-gold/80" />
              FAQ
            </span>
            <h2
              className={`${display} text-foreground text-4xl sm:text-5xl font-bold tracking-tight mb-5 mt-4`}
            >
              Frequently asked questions
            </h2>
            <p className="text-foreground/55 text-base leading-relaxed">
              Everything you need to know about Stack Tracker. Can&rsquo;t find
              what you&rsquo;re looking for? Reach out to us.
            </p>
          </div>

          <Accordion
            type="single"
            collapsible
            defaultValue="faq-0"
            className="w-full"
          >
            {faqs.map((f, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="border-b border-[rgba(200,155,60,0.12)] last:border-b-0"
              >
                <AccordionTrigger
                  className={`${display} text-foreground hover:text-gold py-5 text-lg lg:text-xl font-medium tracking-tight hover:no-underline [&[data-state=open]>svg]:text-gold`}
                >
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="text-foreground/55 text-base leading-relaxed pb-5 pr-4">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="relative py-24 lg:py-32 overflow-hidden">
      <div className="absolute inset-x-0 top-0">
        <div className={goldDivider} />
      </div>

      <div aria-hidden className="absolute inset-0 -z-10 pointer-events-none">
        <img
          src="/landing/cta-bg.webp"
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-background/55" />
      </div>

      <div className="relative max-w-[1280px] mx-auto px-5 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto">
          <h2
            className={`${display} text-foreground text-4xl sm:text-5xl lg:text-[3.25rem] font-bold tracking-tight mb-6`}
          >
            Ready to run your best{' '}
            <span className={goldGradient}>homegame</span> yet?
          </h2>
          <p className="text-foreground/55 text-lg leading-relaxed mb-10">
            Free forever for players and organisers. Setup takes under a minute.
          </p>
          <Link to="/auth" className={`${btnGold} px-8 py-4 text-base`}>
            Get Started — Free
            <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
          </Link>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0">
        <div className={goldDivider} />
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="relative py-12 lg:py-14 border-t border-[rgba(200,155,60,0.08)] pb-[max(2rem,env(safe-area-inset-bottom))]">
      <div className="max-w-[1280px] mx-auto px-5 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-8 items-start md:items-center">
          <div className="flex items-center gap-2.5">
            <img
              src="/icon-192x192.png"
              alt="Stack Tracker logo"
              className="w-7 h-7 rounded-md"
            />
            <span className="text-foreground/80 font-semibold text-sm tracking-tight">
              Stack Tracker
            </span>
            <span className="text-foreground/30 text-sm">
              · Poker Homegame Manager
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <a
              href="#features"
              className="text-foreground/45 hover:text-gold transition-colors"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="text-foreground/45 hover:text-gold transition-colors"
            >
              How It Works
            </a>
            <a
              href="#faq"
              className="text-foreground/45 hover:text-gold transition-colors"
            >
              FAQ
            </a>
            <Link
              to="/poker-settlement-calculator"
              className="text-foreground/45 hover:text-gold transition-colors"
            >
              Settlement Calculator
            </Link>
            <Link
              to="/poker-hand-calculator"
              className="text-foreground/45 hover:text-gold transition-colors"
            >
              Hand Calculator
            </Link>
            <Link
              to="/about"
              className="text-foreground/45 hover:text-gold transition-colors"
            >
              About
            </Link>
            <Link
              to="/auth"
              className="text-foreground/45 hover:text-gold transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>

        <div className={`${goldDivider} my-8 opacity-60`} />

        <p className="text-foreground/30 text-xs">
          &copy; {new Date().getFullYear()} Stack Tracker. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

/* ---------- root ---------- */

export function LandingPage() {
  return (
    <div className="min-h-dvh bg-background text-foreground overflow-x-hidden">
      <MarketingNavbar />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}

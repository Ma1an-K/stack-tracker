import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { usePageMeta } from '@/hooks/usePageMeta';
import {
  PRIVACY_TITLE,
  PRIVACY_DESCRIPTION,
  PRIVACY_CANONICAL,
  PRIVACY_CONTACT,
  PRIVACY_UPDATED,
  PRIVACY_JSON_LD,
} from './privacyMeta';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-bold tracking-tight pt-4">{title}</h2>
      {children}
    </section>
  );
}

function Bullets({ items }: { items: ReactNode[] }) {
  return (
    <ul className="space-y-2 list-none pl-0">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <span className="text-gold mt-1">•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function PrivacyPage() {
  usePageMeta({
    title: PRIVACY_TITLE,
    description: PRIVACY_DESCRIPTION,
    canonical: PRIVACY_CANONICAL,
    jsonLd: PRIVACY_JSON_LD,
  });

  const mail = (
    <a href={`mailto:${PRIVACY_CONTACT}`} className="text-gold underline underline-offset-2">
      {PRIVACY_CONTACT}
    </a>
  );

  return (
    <div className="min-h-dvh bg-background text-foreground overflow-x-hidden">
      <header className="relative z-10 px-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="max-w-3xl mx-auto flex items-center justify-between py-3">
          <Link to="/" className="flex items-center gap-2">
            <img
              src="/icon-192x192.png"
              alt="Stack Tracker logo"
              className="w-8 h-8 rounded-lg shadow-[0_0_12px_hsl(var(--gold)/0.45)]"
            />
            <span className="font-bold tracking-tight">Stack Tracker</span>
          </Link>
          <Link to="/auth" className="text-sm font-medium text-gold hover:underline underline-offset-4">
            Sign In
          </Link>
        </div>
      </header>

      <main className="relative z-10 px-[max(1.25rem,env(safe-area-inset-left))] pr-[max(1.25rem,env(safe-area-inset-right))] pt-6 pb-20">
        <article className="max-w-2xl mx-auto">
          <p className="text-[11px] uppercase tracking-[0.2em] text-gold/80 font-semibold mb-3">Privacy</p>
          <h1 className="text-3xl sm:text-4xl font-extrabold leading-[1.1] tracking-tight mb-2">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground mb-8">Last updated {PRIVACY_UPDATED}</p>

          <div className="space-y-5 text-base leading-relaxed text-foreground/90">
            <p>
              Stack Tracker is a free app for tracking private home poker games, run by an
              individual developer in Australia. This policy explains what the app collects,
              why, and what you can do about it. Questions go to {mail}.
            </p>

            <Section title="What we collect">
              <Bullets
                items={[
                  <><strong>Account details:</strong> your email address, password (stored only as a secure hash by our sign-in provider), username and optional display name.</>,
                  <><strong>Game records:</strong> homegames you create or join, player names, sessions, buy-ins, cash-outs and who-owes-whom settlements. Some of this is entered by other members of your homegame.</>,
                  <><strong>One-off games:</strong> games you choose to save to your history. Unsaved one-off games stay on your device only.</>,
                  <><strong>Notification details:</strong> if you turn on notifications, a push subscription for your device so we can send game alerts.</>,
                  <><strong>Error reports:</strong> when something breaks, the error message, the page, your browser type and app version, linked to your account so we can fix it.</>,
                ]}
              />
              <p>
                We don't use advertising, analytics or tracking cookies, and we don't collect your
                location, contacts or payment details. Stack Tracker records amounts owed between
                players but never moves money.
              </p>
            </Section>

            <Section title="How we use it">
              <p>
                Only to run the app: signing you in, showing your homegame's sessions, stats and
                settlements to its members, sending notifications you turned on, and fixing bugs.
                We don't sell your data or use it for advertising.
              </p>
            </Section>

            <Section title="Who can see it">
              <Bullets
                items={[
                  <><strong>Your homegame's members</strong> can see that game's players, sessions, results and badges. Members of other homegames can't.</>,
                  <><strong>Service providers</strong> that host the app for us: Supabase (database and sign-in), Vercel (website hosting), Google Fonts (typefaces), and your device's push service (Apple, Google or your browser maker) when notifications are on. They process data only to provide their service.</>,
                  <><strong>Anyone you share a link with</strong>, if you share a settlement or calculator result.</>,
                  <>Authorities, if the law requires it.</>,
                ]}
              />
            </Section>

            <Section title="How long we keep it">
              <p>
                We keep your account and game records while your account exists. When you delete
                your account, your personal data is deleted straight away, as described below, and
                any error reports are kept only without the link to you.
              </p>
            </Section>

            <Section title="Deleting your account">
              <p>
                Open the club menu, choose <strong>Profile</strong>, then <strong>Delete my account</strong>.
                This permanently deletes your sign-in, profile, saved one-off games and notification
                subscriptions.
              </p>
              <p>
                Homegames you own pass to another member so the group keeps its history; homegames
                with no other members are deleted. Past sessions stay in each group's records under
                the player name the group used, no longer linked to you. If you can't sign in,
                email {mail} from your account's email address and we'll delete it for you.
              </p>
            </Section>

            <Section title="Your rights">
              <p>
                You can see and edit your profile in the app, and ask us for a copy of your data or
                to correct or delete it by emailing {mail}. If you're unhappy with how we've handled
                a request, you can contact the Office of the Australian Information Commissioner
                (oaic.gov.au) or your local data protection authority.
              </p>
            </Section>

            <Section title="Children">
              <p>Stack Tracker isn't meant for anyone under 18, and we don't knowingly collect data from children.</p>
            </Section>

            <Section title="Security">
              <p>
                Data is sent over encrypted connections, and database rules limit each person to the
                homegames they belong to. No system is perfectly secure, so please use a password you
                don't use anywhere else.
              </p>
            </Section>

            <Section title="Changes">
              <p>
                If this policy changes, we'll update the date at the top and, for significant changes,
                let you know in the app.
              </p>
            </Section>
          </div>
        </article>
      </main>

      <footer className="relative z-10 px-[max(1.25rem,env(safe-area-inset-left))] pr-[max(1.25rem,env(safe-area-inset-right))] py-8 border-t border-[hsl(var(--gold)/0.18)] pb-[max(2rem,env(safe-area-inset-bottom))]">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground transition-colors">Stack Tracker — Poker Homegame Manager</Link>
          <div className="flex items-center gap-4">
            <Link to="/about" className="hover:text-foreground transition-colors">About</Link>
            <Link to="/auth" className="hover:text-foreground transition-colors">Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

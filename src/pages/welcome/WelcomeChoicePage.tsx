import type { ComponentType, ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Link2, Spade, Zap } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import { AuthScreen } from '@/components/auth/AuthScreen';
import { markWelcomeSeen } from '@/lib/onboarding/welcomeTarget';
import { cn } from '@/lib/utils';

const cardClass =
  'pressable grid w-full grid-cols-[40px_1fr] items-center gap-x-3.5 gap-y-1 rounded-xl border bg-card p-4 text-left ' +
  'hover:bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring';

function CardBody({ icon: Icon, title, hint }: { icon: ComponentType<{ className?: string }>; title: string; hint: string }) {
  return (
    <>
      <span aria-hidden="true" className="row-span-2 flex h-10 w-10 items-center justify-center rounded-xl bg-gold/15 text-gold">
        <Icon className="h-5 w-5" />
      </span>
      <span className="text-base font-semibold text-foreground">{title}</span>
      <span className="text-[0.8125rem] text-muted-foreground">{hint}</span>
    </>
  );
}

function ChoiceLink({ to, featured, children }: { to: string; featured?: boolean; children: ReactNode }) {
  return (
    <Link to={to} onClick={markWelcomeSeen} className={cn(cardClass, featured ? 'border-gold/45' : 'border-border')}>
      {children}
    </Link>
  );
}

/** "What brings you here?": the first screen after sign-up for anyone without a homegame or invite. */
export function WelcomeChoicePage() {
  const { profile } = useAuthContext();
  const navigate = useNavigate();
  const name = profile?.display_name || profile?.username;

  const settleTonight = () => {
    markWelcomeSeen();
    navigate('/one-off');
  };

  return (
    <AuthScreen eyebrow={name ? `Welcome, ${name}` : 'Welcome'} headline="What brings you here?">
      <nav aria-label="Ways to start" className="grid gap-3">
        <ChoiceLink to="/welcome/host" featured>
          <CardBody icon={Spade} title="I run a regular game" hint="Track your crew, standings and who owes what" />
        </ChoiceLink>
        <ChoiceLink to="/welcome/join">
          <CardBody icon={Link2} title="I've got an invite" hint="Join your friends' homegame with a code" />
        </ChoiceLink>
        <button type="button" onClick={settleTonight} className={cn(cardClass, 'border-border')}>
          <CardBody icon={Zap} title="Just settle tonight" hint="Work out who pays whom. No setup." />
        </button>
      </nav>
      <p className="mt-auto pt-8 text-center text-sm text-muted-foreground">You can do the others any time.</p>
    </AuthScreen>
  );
}

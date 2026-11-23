import { useState, useEffect, ReactNode } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { useTutorialContext } from '@/contexts/TutorialContext';
import { toast } from '@/hooks/use-toast';
import { Loader2, Plus, Link2, MailCheck, ArrowLeft } from 'lucide-react';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { PokerChipSpade } from '@/components/icons/PokerChipSpade';
import { SplashScreen } from '@/components/common/SplashScreen';
import { cn } from '@/lib/utils';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signupSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  username: z
    .string()
    .min(2, 'Username must be at least 2 characters')
    .max(20, 'Username must be 20 characters or less'),
});

type Step = 'auth' | 'signup' | 'setup' | 'forgot';

// ─── Shared screen chrome (same tokens as the rest of the app) ───────────────

function AuthScreen({ eyebrow, headline, children }: { eyebrow?: string; headline: ReactNode; children: ReactNode }) {
  return (
    <div className="fixed inset-0 overflow-y-auto bg-background">
      <div aria-hidden="true" className="pointer-events-none fixed -left-28 -top-28 h-[460px] w-[460px] rounded-full bg-[radial-gradient(circle,hsl(var(--gold)/0.12)_0%,transparent_65%)]" />
      <div aria-hidden="true" className="pointer-events-none fixed -right-24 bottom-0 h-[360px] w-[360px] rounded-full bg-[radial-gradient(circle,hsl(var(--gold)/0.06)_0%,transparent_65%)]" />
      <main className="relative mx-auto flex min-h-full w-full max-w-sm flex-col px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[calc(env(safe-area-inset-top)+2.5rem)] page-enter">
        <Link to="/" className="mb-10 flex items-center gap-2.5 self-start rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Stack Tracker home">
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-gold/40 bg-card shadow-[0_0_24px_-6px_hsl(var(--gold)/0.6)]">
            <PokerChipSpade className="h-5 w-5 text-gold" />
          </span>
          <span className="text-[0.75rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Stack Tracker</span>
        </Link>
        {eyebrow && <p className="section-header mb-2">{eyebrow}</p>}
        <h1 className="font-display text-[2.6rem] font-semibold leading-[1.02] text-foreground">{headline}</h1>
        <div aria-hidden="true" className="gold-hairline mb-8 mt-6 h-px w-24 bg-left" />
        <div className="flex flex-1 flex-col">{children}</div>
      </main>
    </div>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function TextLink({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-[44px] items-center font-medium text-gold underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
    >
      {children}
    </button>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AuthPage() {
  const {
    signIn,
    signUp,
    signOut,
    createHomegame,
    joinHomegame,
    resetPasswordForEmail,
    user,
    homegames,
    loading: authLoading,
  } = useAuthContext();
  const { startTour } = useTutorialContext();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  // Landing-page "Get started" links pass ?mode=signup so new visitors open on Create Account.
  const [step, setStep] = useState<Step>(() => (searchParams.get('mode') === 'signup' && !user ? 'signup' : 'auth'));
  const [confirmEmail, setConfirmEmail] = useState<string | null>(null);

  const [forgotEmail, setForgotEmail] = useState('');
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState({ email: '', password: '', username: '' });
  const [setupForm, setSetupForm] = useState({ homegameName: '', inviteCode: '' });
  const [setupMode, setSetupMode] = useState<'create' | 'join'>('create');

  useEffect(() => {
    if (authLoading) return;
    if (user && homegames.length > 0) {
      navigate('/', { replace: true });
      return;
    }
    if (user && homegames.length === 0 && step === 'auth') {
      setStep('setup');
    }
  }, [user, homegames, authLoading, step, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = loginSchema.safeParse(loginForm);
    if (!result.success) {
      toast({ title: 'Validation Error', description: result.error.errors[0].message, variant: 'destructive' });
      return;
    }
    setLoading(true);
    const { error } = await signIn(loginForm.email, loginForm.password);
    setLoading(false);
    if (error) {
      toast({
        title: 'Login Failed',
        description: error.message === 'Invalid login credentials' ? 'Invalid email or password' : error.message,
        variant: 'destructive',
      });
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = signupSchema.safeParse(signupForm);
    if (!result.success) {
      toast({ title: 'Validation Error', description: result.error.errors[0].message, variant: 'destructive' });
      return;
    }
    setLoading(true);
    const { error } = await signUp(signupForm.email, signupForm.password, signupForm.username);
    setLoading(false);
    if (error) {
      if (error.message?.includes('already registered')) {
        toast({ title: 'Signup Failed', description: 'An account with this email already exists', variant: 'destructive' });
      } else {
        toast({ title: 'Signup Failed', description: error.message || 'Failed to create account', variant: 'destructive' });
      }
    } else {
      await signOut();
      setConfirmEmail(signupForm.email);
      setLoginForm({ email: signupForm.email, password: '' });
      setSignupForm({ email: '', password: '', username: '' });
      setStep('auth');
      toast({ title: 'Account Created', description: 'Please check your email to confirm, then sign in.' });
    }
  };

  const handleCreateHomegame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupForm.homegameName.trim()) {
      toast({ title: 'Error', description: 'Please enter a homegame name', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const { error } = await createHomegame(setupForm.homegameName);
    setLoading(false);
    if (error) {
      toast({ title: 'Error', description: 'Failed to create homegame', variant: 'destructive' });
    } else {
      startTour('owner');
    }
  };

  const handleJoinHomegame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupForm.inviteCode.trim()) {
      toast({ title: 'Error', description: 'Please enter an invite code', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const { error } = await joinHomegame(setupForm.inviteCode);
    setLoading(false);
    if (error) {
      toast({ title: 'Error', description: error.message || 'Failed to join homegame', variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'You have joined the homegame' });
    }
  };

  const handleBackToLogin = async () => {
    await signOut();
    setStep('auth');
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      toast({ title: 'Error', description: 'Please enter your email', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const { error } = await resetPasswordForEmail(forgotEmail);
    setLoading(false);
    if (error) {
      toast({ title: 'Error', description: error.message || 'Failed to send reset email', variant: 'destructive' });
    } else {
      toast({ title: 'Reset email sent', description: 'Check your inbox for a password reset link.' });
      setForgotEmail('');
      setStep('auth');
    }
  };

  // ─── Loading ──────────────────────────────────────────────────────────────────

  if (authLoading) return <SplashScreen />;

  // ─── Sign In ──────────────────────────────────────────────────────────────────

  if (step === 'auth') {
    return (
      <AuthScreen eyebrow="Welcome back" headline={<>Track every hand.<br />Settle every debt.</>}>
        {confirmEmail && (
          <div role="status" className="mb-6 flex gap-3 rounded-xl border border-gold/35 bg-gold/[0.07] p-3.5 text-sm">
            <MailCheck className="mt-0.5 h-5 w-5 shrink-0 text-gold" aria-hidden="true" />
            <p>
              <span className="font-semibold">Check your inbox.</span>{' '}
              <span className="text-muted-foreground">We sent a confirmation link to {confirmEmail}. Confirm it, then sign in here.</span>
            </p>
          </div>
        )}
        <form onSubmit={handleLogin} className="space-y-4">
          <Field id="login-email" label="Email">
            <Input
              id="login-email"
              type="email"
              inputMode="email"
              value={loginForm.email}
              onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
              required
              autoComplete="email"
            />
          </Field>
          <Field id="login-password" label="Password">
            <Input
              id="login-password"
              type="password"
              value={loginForm.password}
              onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
              required
              autoComplete="current-password"
            />
          </Field>
          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading && <Loader2 className="animate-spin" />}
            Sign in
          </Button>
        </form>
        <Button type="button" variant="secondary" size="lg" className="mt-3 w-full" onClick={() => setStep('signup')}>
          Create account
        </Button>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Forgot password? <TextLink onClick={() => setStep('forgot')}>Reset it</TextLink>
        </p>
      </AuthScreen>
    );
  }

  // ─── Sign Up ──────────────────────────────────────────────────────────────────

  if (step === 'signup') {
    return (
      <AuthScreen eyebrow="Free forever" headline="Join the table.">
        <form onSubmit={handleSignup} className="space-y-4">
          <Field id="signup-username" label="Username">
            <Input
              id="signup-username"
              type="text"
              value={signupForm.username}
              onChange={(e) => setSignupForm({ ...signupForm, username: e.target.value })}
              required
              maxLength={20}
              autoComplete="username"
              autoCapitalize="none"
            />
          </Field>
          <Field id="signup-email" label="Email">
            <Input
              id="signup-email"
              type="email"
              inputMode="email"
              value={signupForm.email}
              onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
              required
              autoComplete="email"
            />
          </Field>
          <Field id="signup-password" label="Password">
            <Input
              id="signup-password"
              type="password"
              value={signupForm.password}
              onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
              required
              autoComplete="new-password"
            />
            <p className="text-xs text-muted-foreground">At least 6 characters.</p>
          </Field>
          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading && <Loader2 className="animate-spin" />}
            Create account
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Already have an account? <TextLink onClick={() => setStep('auth')}>Sign in</TextLink>
        </p>
      </AuthScreen>
    );
  }

  // ─── Forgot Password ──────────────────────────────────────────────────────────

  if (step === 'forgot') {
    return (
      <AuthScreen eyebrow="Account" headline="Reset your password.">
        <form onSubmit={handleForgotPassword} className="space-y-4">
          <Field id="forgot-email" label="Email">
            <Input
              id="forgot-email"
              type="email"
              inputMode="email"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              required
              autoComplete="email"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">We'll send a reset link straight to your inbox.</p>
          </Field>
          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading && <Loader2 className="animate-spin" />}
            Send reset link
          </Button>
        </form>
        <Button type="button" variant="ghost" size="lg" className="mt-3 w-full" onClick={() => setStep('auth')}>
          <ArrowLeft /> Back to sign in
        </Button>
      </AuthScreen>
    );
  }

  // ─── Setup (step === 'setup') ─────────────────────────────────────────────────

  return (
    <AuthScreen eyebrow="One last step" headline={<>Welcome to<br />the table.</>}>
      <div role="tablist" aria-label="Create or join" className="mb-6 grid grid-cols-2 gap-1 rounded-xl border border-border/60 bg-muted p-1">
        {([
          { mode: 'create' as const, icon: Plus, label: 'Create game' },
          { mode: 'join' as const, icon: Link2, label: 'Join with code' },
        ]).map(({ mode, icon: Icon, label }) => (
          <button
            key={mode}
            type="button"
            role="tab"
            aria-selected={setupMode === mode}
            onClick={() => setSetupMode(mode)}
            className={cn(
              'pressable flex min-h-[48px] items-center justify-center gap-2 rounded-lg text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              setupMode === mode
                ? 'bg-secondary text-gold shadow-[inset_0_1px_0_hsl(40_70%_75%/0.08),0_2px_8px_-4px_hsl(0_0%_0%/0.8)]'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>
      {setupMode === 'create' ? (
        <form onSubmit={handleCreateHomegame} className="space-y-4">
          <Field id="setup-name" label="Game name">
            <Input
              id="setup-name"
              type="text"
              placeholder="Friday Night Game"
              value={setupForm.homegameName}
              onChange={(e) => setSetupForm({ ...setupForm, homegameName: e.target.value })}
              required
              autoFocus
            />
          </Field>
          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading && <Loader2 className="animate-spin" />}
            Create game
          </Button>
        </form>
      ) : (
        <form onSubmit={handleJoinHomegame} className="space-y-4">
          <Field id="setup-code" label="Invite code">
            <Input
              id="setup-code"
              type="text"
              placeholder="ABCD1234"
              value={setupForm.inviteCode}
              onChange={(e) => setSetupForm({ ...setupForm, inviteCode: e.target.value.toUpperCase() })}
              className="text-center font-mono text-lg tracking-[0.2em]"
              maxLength={8}
              autoCapitalize="characters"
              autoComplete="off"
              required
            />
          </Field>
          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading && <Loader2 className="animate-spin" />}
            Join game
          </Button>
        </form>
      )}
      <p className="mt-4 text-center text-sm text-muted-foreground">
        Wrong account? <TextLink onClick={handleBackToLogin}>Back to sign in</TextLink>
      </p>
    </AuthScreen>
  );
}

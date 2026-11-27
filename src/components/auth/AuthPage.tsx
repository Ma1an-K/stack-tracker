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
import { PasswordInput } from '@/components/common/PasswordInput';
import { cn } from '@/lib/utils';
import { parseInviteCode, savePendingCode, readPendingCode, clearPendingCode } from '@/lib/inviteLink';

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

function Field({ id, label, error, children }: { id: string; label: string; error?: string | null; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

/** Problem with the whole submit (wrong password, server error): stays until the next try. */
function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 px-3.5 py-3 text-sm text-destructive">
      {message}
    </p>
  );
}

// Invite codes: ignore spaces and hyphens people paste in, compare in capitals.
const normaliseCode = (v: string) => v.replace(/[\s-]/g, '').toUpperCase().slice(0, 8);

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
  const [searchParams, setSearchParams] = useSearchParams();
  // Read once on mount: from the link if present, else from this device (after email confirmation).
  const [inviteCode] = useState<string | null>(() => parseInviteCode(searchParams.get('code')) ?? readPendingCode());
  const [loading, setLoading] = useState(false);
  // Landing-page "Get started" links pass ?mode=signup so new visitors open on Create Account.
  const [step, setStep] = useState<Step>(() => (searchParams.get('mode') === 'signup' && !user ? 'signup' : 'auth'));
  const [confirmEmail, setConfirmEmail] = useState<string | null>(null);

  const [forgotEmail, setForgotEmail] = useState('');
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState({ email: '', password: '', username: '' });
  const [setupForm, setSetupForm] = useState({ homegameName: '', inviteCode: inviteCode ?? '' });
  const [setupMode, setSetupMode] = useState<'create' | 'join'>(inviteCode ? 'join' : 'create');

  // Keep the link's code on this device, then drop it from the address bar so it
  // doesn't linger in history or get shared on with a copied URL.
  useEffect(() => {
    if (!searchParams.has('code')) return;
    if (inviteCode) savePendingCode(inviteCode);
    const next = new URLSearchParams(searchParams);
    next.delete('code');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, inviteCode]);
  // Inline errors: one field at a time (next to the field), or one for the whole form.
  const [fieldError, setFieldError] = useState<{ id: string; message: string } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const flagField = (id: string, message: string) => {
    setFieldError({ id, message });
    requestAnimationFrame(() => document.getElementById(id)?.focus());
  };
  const errorFor = (id: string) => (fieldError?.id === id ? fieldError.message : null);
  const invalidProps = (id: string) =>
    fieldError?.id === id ? { 'aria-invalid': true as const, 'aria-describedby': `${id}-error` } : {};
  const clearErrors = (id?: string) => {
    if (!id || fieldError?.id === id) setFieldError(null);
    setFormError(null);
  };
  const goTo = (next: Step) => {
    setFieldError(null);
    setFormError(null);
    setStep(next);
  };

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
    clearErrors();
    const result = loginSchema.safeParse(loginForm);
    if (!result.success) {
      const issue = result.error.errors[0];
      flagField(`login-${String(issue.path[0])}`, issue.message);
      return;
    }
    setLoading(true);
    const { error } = await signIn(loginForm.email, loginForm.password);
    setLoading(false);
    if (error) {
      const message = error.message === 'Invalid login credentials' ? 'Invalid email or password' : error.message;
      setFormError(
        error.message === 'Invalid login credentials'
          ? 'That email and password don’t match. Check them, or reset your password below.'
          : message
      );
      toast({ title: 'Login Failed', description: message, variant: 'destructive' });
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();
    const result = signupSchema.safeParse(signupForm);
    if (!result.success) {
      const issue = result.error.errors[0];
      flagField(`signup-${String(issue.path[0])}`, issue.message);
      return;
    }
    setLoading(true);
    const { error } = await signUp(signupForm.email, signupForm.password, signupForm.username);
    setLoading(false);
    if (error) {
      if (error.message?.includes('already registered')) {
        setFormError('An account with this email already exists. Sign in instead, or reset your password.');
        toast({ title: 'Signup Failed', description: 'An account with this email already exists', variant: 'destructive' });
      } else {
        setFormError(error.message || 'Failed to create account. Check your connection and try again.');
        toast({ title: 'Signup Failed', description: error.message || 'Failed to create account', variant: 'destructive' });
      }
    } else {
      await signOut();
      setConfirmEmail(signupForm.email);
      setLoginForm({ email: signupForm.email, password: '' });
      setSignupForm({ email: '', password: '', username: '' });
      goTo('auth');
      toast({ title: 'Account Created', description: 'Please check your email to confirm, then sign in.' });
    }
  };

  const handleCreateHomegame = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();
    if (!setupForm.homegameName.trim()) {
      flagField('setup-name', 'Enter a name for your game.');
      return;
    }
    setLoading(true);
    const { error } = await createHomegame(setupForm.homegameName);
    setLoading(false);
    if (error) {
      setFormError('Couldn’t create the game. Check your connection and try again.');
      toast({ title: 'Error', description: 'Failed to create homegame', variant: 'destructive' });
    } else {
      startTour('owner');
    }
  };

  const handleJoinHomegame = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();
    if (!setupForm.inviteCode.trim()) {
      flagField('setup-code', 'Enter the invite code your host shared.');
      return;
    }
    setLoading(true);
    const { error } = await joinHomegame(setupForm.inviteCode);
    setLoading(false);
    if (error) {
      setFormError(`${error.message || 'Failed to join homegame'}. Check the code with your host and try again.`);
      toast({ title: 'Error', description: error.message || 'Failed to join homegame', variant: 'destructive' });
    } else {
      clearPendingCode();
      toast({ title: 'Success', description: 'You have joined the homegame' });
    }
  };

  const handleBackToLogin = async () => {
    await signOut();
    goTo('auth');
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();
    if (!forgotEmail.trim()) {
      flagField('forgot-email', 'Enter the email you signed up with.');
      return;
    }
    setLoading(true);
    const { error } = await resetPasswordForEmail(forgotEmail);
    setLoading(false);
    if (error) {
      setFormError(error.message || 'Failed to send reset email. Try again in a minute.');
      toast({ title: 'Error', description: error.message || 'Failed to send reset email', variant: 'destructive' });
    } else {
      toast({ title: 'Reset email sent', description: 'Check your inbox for a password reset link.' });
      setForgotEmail('');
      goTo('auth');
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
          <Field id="login-email" label="Email" error={errorFor('login-email')}>
            <Input
              id="login-email"
              type="email"
              inputMode="email"
              value={loginForm.email}
              onChange={(e) => { clearErrors('login-email'); setLoginForm({ ...loginForm, email: e.target.value }); }}
              required
              autoComplete="email"
              {...invalidProps('login-email')}
            />
          </Field>
          <Field id="login-password" label="Password" error={errorFor('login-password')}>
            <PasswordInput
              id="login-password"
              value={loginForm.password}
              onChange={(e) => { clearErrors('login-password'); setLoginForm({ ...loginForm, password: e.target.value }); }}
              required
              autoComplete="current-password"
              {...invalidProps('login-password')}
            />
          </Field>
          <FormError message={formError} />
          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading && <Loader2 className="animate-spin" />}
            Sign in
          </Button>
        </form>
        <Button type="button" variant="secondary" size="lg" className="mt-3 w-full" onClick={() => goTo('signup')}>
          Create account
        </Button>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Forgot password? <TextLink onClick={() => goTo('forgot')}>Reset it</TextLink>
        </p>
      </AuthScreen>
    );
  }

  // ─── Sign Up ──────────────────────────────────────────────────────────────────

  if (step === 'signup') {
    return (
      <AuthScreen eyebrow="Free forever" headline="Join the table.">
        <form onSubmit={handleSignup} className="space-y-4">
          <Field id="signup-username" label="Username" error={errorFor('signup-username')}>
            <Input
              id="signup-username"
              type="text"
              value={signupForm.username}
              onChange={(e) => { clearErrors('signup-username'); setSignupForm({ ...signupForm, username: e.target.value }); }}
              {...invalidProps('signup-username')}
              required
              maxLength={20}
              autoComplete="username"
              autoCapitalize="none"
            />
          </Field>
          <Field id="signup-email" label="Email" error={errorFor('signup-email')}>
            <Input
              id="signup-email"
              type="email"
              inputMode="email"
              value={signupForm.email}
              onChange={(e) => { clearErrors('signup-email'); setSignupForm({ ...signupForm, email: e.target.value }); }}
              {...invalidProps('signup-email')}
              required
              autoComplete="email"
            />
          </Field>
          <Field id="signup-password" label="Password" error={errorFor('signup-password')}>
            <PasswordInput
              id="signup-password"
              value={signupForm.password}
              onChange={(e) => { clearErrors('signup-password'); setSignupForm({ ...signupForm, password: e.target.value }); }}
              required
              autoComplete="new-password"
              aria-describedby={fieldError?.id === 'signup-password' ? 'signup-password-error signup-password-hint' : 'signup-password-hint'}
              aria-invalid={fieldError?.id === 'signup-password' || undefined}
            />
            <p id="signup-password-hint" className="text-xs text-muted-foreground">At least 6 characters.</p>
          </Field>
          <FormError message={formError} />
          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading && <Loader2 className="animate-spin" />}
            Create account
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            By creating an account you agree to how we handle your data in our{' '}
            <Link to="/privacy" className="underline underline-offset-2 hover:text-foreground">privacy policy</Link>.
          </p>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Already have an account? <TextLink onClick={() => goTo('auth')}>Sign in</TextLink>
        </p>
      </AuthScreen>
    );
  }

  // ─── Forgot Password ──────────────────────────────────────────────────────────

  if (step === 'forgot') {
    return (
      <AuthScreen eyebrow="Account" headline="Reset your password.">
        <form onSubmit={handleForgotPassword} className="space-y-4">
          <Field id="forgot-email" label="Email" error={errorFor('forgot-email')}>
            <Input
              id="forgot-email"
              type="email"
              inputMode="email"
              value={forgotEmail}
              onChange={(e) => { clearErrors('forgot-email'); setForgotEmail(e.target.value); }}
              required
              autoComplete="email"
              autoFocus
              aria-describedby={fieldError?.id === 'forgot-email' ? 'forgot-email-error forgot-email-hint' : 'forgot-email-hint'}
              aria-invalid={fieldError?.id === 'forgot-email' || undefined}
            />
            <p id="forgot-email-hint" className="text-xs text-muted-foreground">We'll send a reset link straight to your inbox.</p>
          </Field>
          <FormError message={formError} />
          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading && <Loader2 className="animate-spin" />}
            Send reset link
          </Button>
        </form>
        <Button type="button" variant="ghost" size="lg" className="mt-3 w-full" onClick={() => goTo('auth')}>
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
            onClick={() => { clearErrors(); setSetupMode(mode); }}
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
          <Field id="setup-name" label="Game name" error={errorFor('setup-name')}>
            <Input
              id="setup-name"
              type="text"
              placeholder="Friday Night Game"
              value={setupForm.homegameName}
              onChange={(e) => { clearErrors('setup-name'); setSetupForm({ ...setupForm, homegameName: e.target.value }); }}
              required
              autoFocus
              autoComplete="off"
              {...invalidProps('setup-name')}
            />
          </Field>
          <FormError message={formError} />
          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading && <Loader2 className="animate-spin" />}
            Create game
          </Button>
        </form>
      ) : (
        <form onSubmit={handleJoinHomegame} className="space-y-4">
          <Field id="setup-code" label="Invite code" error={errorFor('setup-code')}>
            <Input
              id="setup-code"
              type="text"
              placeholder="ABCD1234"
              value={setupForm.inviteCode}
              onChange={(e) => { clearErrors('setup-code'); setSetupForm({ ...setupForm, inviteCode: normaliseCode(e.target.value) }); }}
              {...invalidProps('setup-code')}
              className="text-center font-mono text-lg tracking-[0.2em]"
              autoCapitalize="characters"
              autoComplete="off"
              required
            />
          </Field>
          {inviteCode && setupForm.inviteCode === inviteCode && (
            <p className="-mt-2 text-sm text-muted-foreground">Filled in from your invite link.</p>
          )}
          <FormError message={formError} />
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

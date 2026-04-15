import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { useTutorialContext } from '@/contexts/TutorialContext';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { z } from 'zod';

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

// ─── Design tokens ────────────────────────────────────────────────────────────

const S: Record<string, React.CSSProperties> = {
  screen: {
    position: 'fixed',
    inset: 0,
    background: '#090b10',
    display: 'flex',
    flexDirection: 'column',
    padding: '52px 28px 44px',
    overflow: 'hidden',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", sans-serif',
    boxSizing: 'border-box',
  },
  glowTopLeft: {
    position: 'absolute',
    top: -60,
    left: -60,
    width: 280,
    height: 280,
    background: 'radial-gradient(circle, rgba(200,155,60,0.10) 0%, transparent 65%)',
    pointerEvents: 'none',
  },
  glowBottomRight: {
    position: 'absolute',
    bottom: 40,
    right: -40,
    width: 220,
    height: 220,
    background: 'radial-gradient(circle, rgba(200,155,60,0.055) 0%, transparent 65%)',
    pointerEvents: 'none',
  },
  suit: {
    fontSize: 24,
    color: '#c89b3c',
    textShadow:
      '0 0 8px rgba(200,155,60,0.7), 0 0 20px rgba(200,155,60,0.3), 0 0 40px rgba(200,155,60,0.12)',
    marginBottom: 14,
    lineHeight: 1,
    display: 'block',
    position: 'relative',
    zIndex: 1,
  },
  headline: {
    color: '#f2e8ce',
    fontSize: 48,
    fontWeight: 800,
    lineHeight: 1.25,
    letterSpacing: '-0.4px',
    marginBottom: 6,
    position: 'relative',
    zIndex: 1,
  },
  appTag: {
    color: '#2e2416',
    fontSize: '10px',
    letterSpacing: '2.5px',
    textTransform: 'uppercase',
    fontWeight: 500,
    position: 'relative',
    zIndex: 1,
  },
  spacer: { flex: 1, maxHeight: 120 },
  divider: {
    height: 1,
    flexShrink: 0,
    background:
      'linear-gradient(90deg, rgba(200,155,60,0.45) 0%, rgba(200,155,60,0.08) 60%, transparent 100%)',
    boxShadow: '0 0 6px rgba(200,155,60,0.15)',
    marginBottom: 22,
    position: 'relative',
    zIndex: 1,
  },
  btnPrimary: {
    marginTop: 20,
    width: '100%',
    height: 44,
    background: 'linear-gradient(135deg, #d4a942 0%, #b8872e 100%)',
    borderRadius: 11,
    color: '#0a0c14',
    fontSize: 13,
    fontWeight: 500,
    letterSpacing: '0.3px',
    border: 'none',
    boxShadow:
      '0 4px 16px rgba(200,155,60,0.38), 0 1px 3px rgba(200,155,60,0.22), inset 0 1px 0 rgba(255,255,255,0.14)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    cursor: 'pointer',
    position: 'relative',
    zIndex: 1,
    flexShrink: 0,
  },
  btnSecondary: {
    marginTop: 8,
    width: '100%',
    height: 42,
    background: 'transparent',
    border: '1px solid rgba(200,155,60,0.18)',
    borderRadius: 11,
    color: 'rgba(200,155,60,0.65)',
    fontSize: 13,
    fontWeight: 400,
    letterSpacing: '0.3px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    position: 'relative',
    zIndex: 1,
    flexShrink: 0,
  },
  micro: {
    color: '#2e2416',
    fontSize: '11px',
    textAlign: 'center',
    marginTop: 14,
    position: 'relative',
    zIndex: 1,
  },
  microSpan: {
    color: '#5a4530',
    cursor: 'pointer',
  },
  hint: {
    color: '#2e2416',
    fontSize: '7.5px',
    lineHeight: 1.6,
    marginTop: 10,
    position: 'relative',
    zIndex: 1,
  },
};

function lbl(first = false): React.CSSProperties {
  return {
    color: '#4a3d26',
    fontSize: '7.5px',
    textTransform: 'uppercase',
    letterSpacing: '1.5px',
    marginBottom: 6,
    marginTop: first ? 0 : 16,
    fontWeight: 600,
    position: 'relative',
    zIndex: 1,
  };
}

function inp(focused: boolean): React.CSSProperties {
  return {
    display: 'block',
    width: '100%',
    height: 34,
    border: 'none',
    borderBottom: focused ? '1px solid rgba(200,155,60,0.5)' : '1px solid #1e1a12',
    boxShadow: focused ? '0 1px 0 rgba(200,155,60,0.28)' : 'none',
    background: 'transparent',
    color: '#f2e8ce',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    position: 'relative',
    zIndex: 1,
  };
}

// ─── Toggle tile helpers ──────────────────────────────────────────────────────

function toggleStyle(active: boolean): React.CSSProperties {
  return active
    ? {
        flex: 1,
        height: 64,
        borderRadius: 11,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        border: '1px solid rgba(200,155,60,0.32)',
        background: 'rgba(200,155,60,0.07)',
        boxShadow: '0 0 14px rgba(200,155,60,0.07), inset 0 1px 0 rgba(200,155,60,0.1)',
        cursor: 'pointer',
      }
    : {
        flex: 1,
        height: 64,
        borderRadius: 11,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        border: '1px solid rgba(180,190,200,0.14)',
        background: 'rgba(180,190,200,0.04)',
        cursor: 'pointer',
      };
}

function toggleIconStyle(active: boolean): React.CSSProperties {
  return {
    fontSize: 16,
    color: active ? '#c89b3c' : '#5a6a78',
    textShadow: active ? '0 0 8px rgba(200,155,60,0.5)' : 'none',
  };
}

function toggleLblStyle(active: boolean): React.CSSProperties {
  return {
    fontSize: '7.5px',
    letterSpacing: '0.5px',
    fontWeight: 600,
    color: active ? '#c89b3c' : '#5a6a78',
  };
}

// ─── Shared screen chrome ─────────────────────────────────────────────────────

function ScreenChrome({ glyph, headline }: { glyph: string; headline: React.ReactNode }) {
  return (
    <>
      <div style={S.glowTopLeft} />
      <div style={S.glowBottomRight} />
      <span style={S.suit}>{glyph}</span>
      <div style={S.headline}>{headline}</div>
      <div style={S.appTag}>Stack Tracker</div>
      <div style={{ ...S.divider, marginTop: 10, marginBottom: 0 }} />
      <div style={S.spacer} />
    </>
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
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<Step>('auth');
  const [focused, setFocused] = useState<string | null>(null);

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
      toast({ title: 'Account Created', description: 'Please check your email to confirm your account.' });
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

  if (authLoading) {
    return (
      <div style={{ ...S.screen, alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: '#c89b3c' }} />
      </div>
    );
  }

  // ─── Sign In ──────────────────────────────────────────────────────────────────

  if (step === 'auth') {
    return (
      <div style={S.screen}>
        <ScreenChrome glyph="♠" headline={<>Track every hand.<br />Settle every debt.</>} />
        <form onSubmit={handleLogin} style={{ position: 'relative', zIndex: 1 }}>
          <div style={lbl(true)}>Email</div>
          <input
            type="email"
            value={loginForm.email}
            onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
            onFocus={() => setFocused('login-email')}
            onBlur={() => setFocused(null)}
            style={inp(focused === 'login-email')}
            required
            autoComplete="email"
          />
          <div style={lbl()}>Password</div>
          <input
            type="password"
            value={loginForm.password}
            onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
            onFocus={() => setFocused('login-password')}
            onBlur={() => setFocused(null)}
            style={inp(focused === 'login-password')}
            required
            autoComplete="current-password"
          />
          <button type="submit" style={S.btnPrimary} disabled={loading}>
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Sign In
          </button>
        </form>
        <button type="button" style={S.btnSecondary} onClick={() => setStep('signup')}>
          Create Account
        </button>
        <div style={S.micro}>
          Forgot password?{' '}
          <span style={S.microSpan} onClick={() => setStep('forgot')}>
            Reset it
          </span>
        </div>
      </div>
    );
  }

  // ─── Sign Up ──────────────────────────────────────────────────────────────────

  if (step === 'signup') {
    return (
      <div style={S.screen}>
        <ScreenChrome glyph="♠" headline="Join the table." />
        <form onSubmit={handleSignup} style={{ position: 'relative', zIndex: 1 }}>
          <div style={lbl(true)}>Username</div>
          <input
            type="text"
            value={signupForm.username}
            onChange={(e) => setSignupForm({ ...signupForm, username: e.target.value })}
            onFocus={() => setFocused('signup-username')}
            onBlur={() => setFocused(null)}
            style={inp(focused === 'signup-username')}
            required
            maxLength={20}
            autoComplete="username"
          />
          <div style={lbl()}>Email</div>
          <input
            type="email"
            value={signupForm.email}
            onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
            onFocus={() => setFocused('signup-email')}
            onBlur={() => setFocused(null)}
            style={inp(focused === 'signup-email')}
            required
            autoComplete="email"
          />
          <div style={lbl()}>Password</div>
          <input
            type="password"
            value={signupForm.password}
            onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
            onFocus={() => setFocused('signup-password')}
            onBlur={() => setFocused(null)}
            style={inp(focused === 'signup-password')}
            required
            autoComplete="new-password"
          />
          <button type="submit" style={S.btnPrimary} disabled={loading}>
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Create Account
          </button>
        </form>
        <button type="button" style={S.btnSecondary} onClick={() => setStep('auth')}>
          Back to Sign In
        </button>
      </div>
    );
  }

  // ─── Forgot Password ──────────────────────────────────────────────────────────

  if (step === 'forgot') {
    return (
      <div style={S.screen}>
        <ScreenChrome glyph="🔑" headline="Reset your password." />
        <form onSubmit={handleForgotPassword} style={{ position: 'relative', zIndex: 1 }}>
          <div style={lbl(true)}>Email</div>
          <input
            type="email"
            value={forgotEmail}
            onChange={(e) => setForgotEmail(e.target.value)}
            onFocus={() => setFocused('forgot-email')}
            onBlur={() => setFocused(null)}
            style={inp(focused === 'forgot-email')}
            required
            autoComplete="email"
          />
          <div style={S.hint}>We'll send a reset link straight to your inbox.</div>
          <button type="submit" style={S.btnPrimary} disabled={loading}>
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Send Reset Link
          </button>
        </form>
        <button type="button" style={S.btnSecondary} onClick={() => setStep('auth')}>
          Back to Sign In
        </button>
      </div>
    );
  }

  // ─── Setup (step === 'setup') ─────────────────────────────────────────────────

  return (
    <div style={S.screen}>
      <ScreenChrome glyph="♠" headline={<>Welcome to<br />the table.</>} />
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, position: 'relative', zIndex: 1 }}>
        <button type="button" style={toggleStyle(setupMode === 'create')} onClick={() => setSetupMode('create')}>
          <span style={toggleIconStyle(setupMode === 'create')}>+</span>
          <span style={toggleLblStyle(setupMode === 'create')}>Create Game</span>
        </button>
        <button type="button" style={toggleStyle(setupMode === 'join')} onClick={() => setSetupMode('join')}>
          <span style={toggleIconStyle(setupMode === 'join')}>🔗</span>
          <span style={toggleLblStyle(setupMode === 'join')}>Join with Code</span>
        </button>
      </div>
      {setupMode === 'create' ? (
        <form onSubmit={handleCreateHomegame} style={{ position: 'relative', zIndex: 1 }}>
          <div style={lbl(true)}>Game Name</div>
          <input
            type="text"
            placeholder="Friday Night Game"
            value={setupForm.homegameName}
            onChange={(e) => setSetupForm({ ...setupForm, homegameName: e.target.value })}
            onFocus={() => setFocused('setup-name')}
            onBlur={() => setFocused(null)}
            style={inp(focused === 'setup-name')}
            required
          />
          <button type="submit" style={S.btnPrimary} disabled={loading}>
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Create Game
          </button>
        </form>
      ) : (
        <form onSubmit={handleJoinHomegame} style={{ position: 'relative', zIndex: 1 }}>
          <div style={lbl(true)}>Invite Code</div>
          <input
            type="text"
            placeholder="ABCD1234"
            value={setupForm.inviteCode}
            onChange={(e) => setSetupForm({ ...setupForm, inviteCode: e.target.value.toUpperCase() })}
            onFocus={() => setFocused('setup-code')}
            onBlur={() => setFocused(null)}
            style={{
              ...inp(focused === 'setup-code'),
              fontFamily: 'monospace',
              textAlign: 'center',
              letterSpacing: '0.2em',
            }}
            maxLength={8}
            required
          />
          <button type="submit" style={S.btnPrimary} disabled={loading}>
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Join Game
          </button>
        </form>
      )}
      <div style={S.micro}>
        <span style={S.microSpan} onClick={handleBackToLogin}>
          Back to sign in
        </span>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { Loader2, Plus, UserPlus, ArrowLeft, KeyRound } from 'lucide-react';
import appIcon from '@/assets/icon.webp';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signupSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  username: z.string().min(2, 'Username must be at least 2 characters').max(20, 'Username must be 20 characters or less'),
});

type Step = 'auth' | 'setup' | 'forgot';

export function AuthPage() {
  const { signIn, signUp, signOut, createHomegame, joinHomegame, resetPasswordForEmail, user, homegames, loading: authLoading } = useAuthContext();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<Step>('auth');

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
      toast({
        title: 'Validation Error',
        description: result.error.errors[0].message,
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    const { error } = await signIn(loginForm.email, loginForm.password);
    setLoading(false);

    if (error) {
      toast({
        title: 'Login Failed',
        description: error.message === 'Invalid login credentials' 
          ? 'Invalid email or password' 
          : error.message,
        variant: 'destructive',
      });
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = signupSchema.safeParse(signupForm);
    if (!result.success) {
      toast({
        title: 'Validation Error',
        description: result.error.errors[0].message,
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    const { error } = await signUp(
      signupForm.email,
      signupForm.password,
      signupForm.username
    );
    setLoading(false);

    if (error) {
      if (error.message?.includes('already registered')) {
        toast({
          title: 'Signup Failed',
          description: 'An account with this email already exists',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Signup Failed',
          description: error.message || 'Failed to create account',
          variant: 'destructive',
        });
      }
    } else {
      toast({
        title: 'Account Created',
        description: 'Please check your email to confirm your account.',
      });
    }
  };

  const handleCreateHomegame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupForm.homegameName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a homegame name',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    const { error } = await createHomegame(setupForm.homegameName);
    setLoading(false);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to create homegame',
        variant: 'destructive',
      });
    }
  };

  const handleJoinHomegame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupForm.inviteCode.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter an invite code',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    const { error } = await joinHomegame(setupForm.inviteCode);
    setLoading(false);

    if (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to join homegame',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'You have joined the homegame',
      });
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

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (step === 'setup') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md border-border/50">
          <CardHeader className="text-center space-y-4">
            <img src={appIcon} alt="Stack Tracker" className="mx-auto w-12 h-12 rounded-xl" />
            <div>
              <CardTitle className="text-xl">Welcome</CardTitle>
              <CardDescription className="mt-2">
                Create a new game or join an existing one
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={setupMode === 'create' ? 'default' : 'secondary'}
                onClick={() => setSetupMode('create')}
                className="flex flex-col h-auto py-3"
              >
                <Plus className="h-5 w-5 mb-1.5" />
                <span className="text-xs">Create New</span>
              </Button>
              <Button
                variant={setupMode === 'join' ? 'default' : 'secondary'}
                onClick={() => setSetupMode('join')}
                className="flex flex-col h-auto py-3"
              >
                <UserPlus className="h-5 w-5 mb-1.5" />
                <span className="text-xs">Join Existing</span>
              </Button>
            </div>

            {setupMode === 'create' ? (
              <form onSubmit={handleCreateHomegame} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="homegame-name" className="text-sm">Game Name</Label>
                  <Input
                    id="homegame-name"
                    type="text"
                    placeholder="Friday Night Game"
                    value={setupForm.homegameName}
                    onChange={(e) => setSetupForm({ ...setupForm, homegameName: e.target.value })}
                    className="bg-muted/30"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Game
                </Button>
              </form>
            ) : (
              <form onSubmit={handleJoinHomegame} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="invite-code" className="text-sm">Invite Code</Label>
                  <Input
                    id="invite-code"
                    type="text"
                    placeholder="ABCD1234"
                    value={setupForm.inviteCode}
                    onChange={(e) => setSetupForm({ ...setupForm, inviteCode: e.target.value.toUpperCase() })}
                    className="font-mono text-center tracking-widest bg-muted/30"
                    maxLength={8}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Ask the game owner for an invite code
                  </p>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Join Game
                </Button>
              </form>
            )}

            <div className="pt-2 border-t border-border/50">
              <Button
                variant="ghost"
                onClick={handleBackToLogin}
                className="w-full text-muted-foreground"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Sign In
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'forgot') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md border-border/50">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
              <KeyRound className="w-6 h-6 text-gold" />
            </div>
            <div>
              <CardTitle className="text-xl">Reset Password</CardTitle>
              <CardDescription className="mt-2">
                Enter your email and we'll send you a reset link
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="forgot-email" className="text-sm">Email</Label>
                <Input
                  id="forgot-email"
                  type="email"
                  placeholder="your@email.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="bg-muted/30"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send Reset Link
              </Button>
            </form>
            <div className="pt-2 border-t border-border/50">
              <Button
                variant="ghost"
                onClick={() => setStep('auth')}
                className="w-full text-muted-foreground"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Sign In
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md border-border/50">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
            <Wallet className="w-6 h-6 text-gold" />
          </div>
          <div>
            <CardTitle className="text-xl">Stack Tracker</CardTitle>
            <CardDescription className="mt-2">
              Track sessions and settlements
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-muted/50">
              <TabsTrigger value="login" className="text-sm">Sign In</TabsTrigger>
              <TabsTrigger value="signup" className="text-sm">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-sm">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="your@email.com"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                    className="bg-muted/30"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password" className="text-sm">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    className="bg-muted/30"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign In
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-xs text-muted-foreground"
                  onClick={() => setStep('forgot')}
                >
                  Forgot password?
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-username" className="text-sm">Username</Label>
                  <Input
                    id="signup-username"
                    type="text"
                    placeholder="username"
                    value={signupForm.username}
                    onChange={(e) => setSignupForm({ ...signupForm, username: e.target.value })}
                    className="bg-muted/30"
                    maxLength={20}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Others can find you by username#ID
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-sm">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="your@email.com"
                    value={signupForm.email}
                    onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                    className="bg-muted/30"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-sm">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={signupForm.password}
                    onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                    className="bg-muted/30"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Account
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

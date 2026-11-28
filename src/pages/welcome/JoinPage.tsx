import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import { AuthScreen } from '@/components/auth/AuthScreen';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { clearPendingCode, parseInviteCode, readPendingCode } from '@/lib/inviteLink';
import { markWelcomeSeen } from '@/lib/onboarding/welcomeTarget';

/** Join a homegame with an invite code. An invite link fills the code in, so this is one tap. */
export function JoinPage() {
  const { joinHomegame } = useAuthContext();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [prefilled] = useState(() => parseInviteCode(params.get('code')) ?? readPendingCode());
  const [code, setCode] = useState(prefilled ?? '');
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setError('Enter your invite code');
      return;
    }
    setError(null);
    setJoining(true);
    const { error: joinError } = await joinHomegame(code);
    setJoining(false);
    if (joinError) {
      setError(joinError instanceof Error ? joinError.message : 'Could not join. Check the code and try again.');
      return;
    }
    // The invite is used up: stop sending this user to /welcome/join.
    clearPendingCode();
    markWelcomeSeen();
    navigate('/welcome/who', { replace: true });
  };

  const top = (
    <button
      type="button"
      onClick={() => navigate('/welcome')}
      className="-ml-2 mb-8 flex min-h-11 items-center gap-1 self-start rounded-lg px-2 text-sm text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      Back
    </button>
  );

  return (
    <AuthScreen top={top} eyebrow="Join a homegame" headline="Enter your invite code">
      <form onSubmit={submit} className="flex flex-1 flex-col">
        <p className="mb-6 text-sm text-muted-foreground">Your host can find it under Invite.</p>
        <div className="space-y-2">
          <Label htmlFor="join-code">Invite code</Label>
          <Input
            id="join-code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/[\s-]/g, '').toUpperCase())}
            placeholder="e.g. ABCD1234"
            autoFocus={!prefilled}
            autoCapitalize="characters"
            autoComplete="off"
            maxLength={8}
            aria-invalid={!!error}
            aria-describedby={error ? 'join-code-error' : undefined}
            className="h-12 text-center font-mono text-lg tracking-[0.2em]"
          />
          {error ? (
            <p id="join-code-error" role="alert" className="text-sm text-destructive">{error}</p>
          ) : (
            prefilled && code === prefilled && <p className="text-sm text-muted-foreground">Filled in from your invite link.</p>
          )}
        </div>
        <div className="mt-auto pt-8">
          <Button type="submit" size="lg" className="w-full" disabled={joining}>
            {joining && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Join homegame
          </Button>
        </div>
      </form>
    </AuthScreen>
  );
}

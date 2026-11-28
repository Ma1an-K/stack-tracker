import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Check, Loader2 } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import { usePlayers } from '@/hooks/usePlayers';
import { usePlayerClaims } from '@/hooks/usePlayerClaims';
import { AuthScreen } from '@/components/auth/AuthScreen';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const linkClass =
  'min-h-11 self-center rounded-lg px-3 text-sm text-muted-foreground hover:text-foreground ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring';

/**
 * "Which one is you?": straight after joining, link the account to a player so
 * results show under My Stats. Names only (no game counts) to avoid another query.
 * Members' claims still go to the host for approval (requestClaim toasts the result).
 */
export function WhoAreYouPage() {
  const { homegame } = useAuthContext();
  const navigate = useNavigate();
  const { players, loading } = usePlayers(homegame?.id);
  const { requestClaim } = usePlayerClaims(homegame?.id);
  const [picked, setPicked] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);

  if (!homegame) return <Navigate to="/" replace />;

  const unclaimed = players.filter((p) => p.user_id === null);

  const claim = async () => {
    if (!picked) return;
    setClaiming(true);
    const { error } = await requestClaim(picked);
    setClaiming(false);
    if (!error) navigate('/', { replace: true });
  };

  const notListed = () => {
    toast({ title: "You're in", description: 'Ask your host to add you, then claim your name from Players.' });
    navigate('/', { replace: true });
  };

  return (
    <AuthScreen eyebrow={homegame.name} headline="Which one is you?">
      <p className="mb-6 text-sm text-muted-foreground">
        This links your results to your account, so they show up under My Stats.
      </p>

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-label="Loading players" />
        </div>
      ) : unclaimed.length === 0 ? (
        <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
          Nobody here is waiting to be claimed yet.
        </p>
      ) : (
        <ul className="grid gap-2" aria-label="Players">
          {unclaimed.map((p) => {
            const selected = picked === p.id;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setPicked(p.id)}
                  className={cn(
                    'pressable flex min-h-12 w-full items-center gap-2.5 rounded-xl border bg-card py-1 pl-2.5 pr-3 text-left',
                    'hover:bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    selected ? 'border-gold/60' : 'border-border'
                  )}
                >
                  <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold/15 text-sm font-semibold text-gold">
                    {p.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1 truncate py-2 text-base text-foreground">{p.name}</span>
                  <Check aria-hidden="true" className={cn('h-4 w-4 text-gold', selected ? 'opacity-100' : 'opacity-0')} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <button type="button" onClick={notListed} className={cn(linkClass, 'mt-2')}>
        I'm not on the list
      </button>

      <div className="mt-auto grid gap-2 pt-8">
        <Button type="button" size="lg" className="w-full" disabled={!picked || claiming} onClick={claim}>
          {claiming && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          That's me
        </Button>
        <button type="button" onClick={() => navigate('/', { replace: true })} className={linkClass}>
          Skip, I'm just watching
        </button>
      </div>
    </AuthScreen>
  );
}

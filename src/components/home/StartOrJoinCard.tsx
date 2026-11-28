import { Link } from 'react-router-dom';
import { KeyRound, Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** Offers to start or join a homegame. Shown on Home and on tabs that need a homegame. */
export function StartOrJoinCard({ className }: { className?: string }) {
  return (
    <section
      aria-labelledby="start-or-join-title"
      className={cn('surface relative overflow-hidden p-5', className)}
    >
      <div aria-hidden="true" className="gold-hairline absolute inset-x-6 top-0 h-px" />
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-gold/30 bg-gold/10">
        <Users className="h-5 w-5 text-gold" aria-hidden="true" />
      </div>
      <h2 id="start-or-join-title" className="font-display text-xl font-semibold">
        Play with the same crew?
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        A homegame keeps running standings, badges and history for everyone.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button asChild className="h-11">
          <Link to="/welcome/host">
            <Plus />
            Start a homegame
          </Link>
        </Button>
        <Button asChild variant="secondary" className="h-11">
          <Link to="/welcome/join">
            <KeyRound />
            Join with code
          </Link>
        </Button>
      </div>
    </section>
  );
}

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Loader2 } from 'lucide-react';
import { useInviteCodes } from '@/hooks/useInviteCodes';
import { pickInviteCode } from '@/lib/onboarding/ensureInviteCode';
import { shareInvite } from '@/lib/onboarding/shareInvite';
import type { Checklist, ChecklistItemId } from '@/lib/onboarding/checklist';
import { cn } from '@/lib/utils';

const LABELS: Record<ChecklistItemId, string> = {
  create: 'Create your game',
  players: 'Add 2 or more players',
  invite: 'Invite your crew',
  game: 'Log your first game',
};

const actionClass =
  'ml-auto flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg px-2 -mr-2 text-[0.8125rem] font-semibold text-gold disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring';

interface GettingStartedCardProps {
  homegameId: string;
  homegameName: string;
  checklist: Checklist;
  onInviteShared: () => void;
}

/** Home's checklist for a new homegame: what's done, and a link to what isn't. */
export function GettingStartedCard({ homegameId, homegameName, checklist, onInviteShared }: GettingStartedCardProps) {
  // Share waits for the existing codes, so it never makes a second one by accident.
  const { activeInviteCodes, loading: codesLoading, createInviteCode } = useInviteCodes(homegameId);
  const [sharing, setSharing] = useState(false);
  const total = checklist.items.length;

  const share = async () => {
    setSharing(true);
    let code = pickInviteCode(activeInviteCodes)?.code;
    if (!code) {
      const res = await createInviteCode({ quiet: true });
      code = (res as { code?: { code: string } }).code?.code;
    }
    if (code && (await shareInvite(homegameId, homegameName, code))) onInviteShared();
    setSharing(false);
  };

  const action = (id: ChecklistItemId) => {
    if (id === 'players') {
      return (
        <Link to="/players" aria-label="Add players" className={actionClass}>
          Add
        </Link>
      );
    }
    if (id === 'invite') {
      return (
        <button type="button" onClick={share} disabled={sharing || codesLoading} aria-label="Share invite" className={actionClass}>
          {sharing && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
          Share
        </button>
      );
    }
    if (id === 'game') {
      return (
        <Link to="/new-session?seat=all" aria-label="Log your first game" className={actionClass}>
          Log
        </Link>
      );
    }
    return null;
  };

  return (
    <section aria-labelledby="getting-started-title" className="surface px-4 pb-2 pt-3.5">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 id="getting-started-title" className="text-sm font-semibold">
          Getting started
        </h2>
        <span className="text-xs tabular-nums text-muted-foreground">
          {checklist.doneCount} of {total}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="Getting started progress"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={checklist.doneCount}
        className="mb-1 h-1 overflow-hidden rounded-full bg-secondary"
      >
        <div className="h-full rounded-full bg-gold" style={{ width: `${(checklist.doneCount / total) * 100}%` }} />
      </div>
      <ul>
        {checklist.items.map((item) => (
          <li key={item.id} className="flex min-h-11 items-center gap-2.5 text-sm">
            <span
              aria-hidden="true"
              className={cn(
                'flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border',
                item.done ? 'border-gold bg-gold text-primary-foreground' : 'border-border'
              )}
            >
              {item.done && <Check className="h-3 w-3" strokeWidth={3} />}
            </span>
            <span className={cn(item.done && 'text-muted-foreground line-through')}>
              {LABELS[item.id]}
              {item.done && <span className="sr-only"> (done)</span>}
            </span>
            {!item.done && action(item.id)}
          </li>
        ))}
      </ul>
    </section>
  );
}

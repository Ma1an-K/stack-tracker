import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { getChecklist, ONBOARDING_CUTOFF, type Checklist } from '@/lib/onboarding/checklist';
import { isInviteShared } from '@/lib/onboarding/ensureInviteCode';

type Counts = { players: number; members: number; sessions: number };

const HIDDEN: Checklist = getChecklist({
  createdAt: ONBOARDING_CUTOFF,
  isOwner: false,
  playerCount: 0,
  memberCount: 0,
  sessionCount: 0,
  inviteShared: false,
});

async function headCount(query: PromiseLike<{ count: number | null; error: unknown }>) {
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

const HEAD = { count: 'exact', head: true } as const;
const countSessions = (homegameId: string) =>
  headCount(supabase.from('sessions').select('*', HEAD).eq('homegame_id', homegameId));

/**
 * The Getting started checklist for a homegame, plus its session count (for the
 * owner only; null otherwise). Players and members are only counted for
 * homegames new enough to get the checklist.
 */
export function useGettingStarted(homegameId: string | undefined) {
  const { homegames } = useAuthContext();
  const game = homegames.find((h) => h.id === homegameId);
  const isOwner = game?.role === 'owner';
  const createdAt = game?.created_at ?? '';
  const isNew = !!game && Date.parse(createdAt) >= Date.parse(ONBOARDING_CUTOFF);

  const [counts, setCounts] = useState<Counts | null>(null);
  const [sessionCount, setSessionCount] = useState<number | null>(null);
  const [inviteShared, setInviteShared] = useState(false);

  useEffect(() => {
    setCounts(null);
    setSessionCount(null);
    if (!homegameId || !isOwner) return;
    setInviteShared(isInviteShared(homegameId));

    let cancelled = false;
    (async () => {
      try {
        if (!isNew) {
          const sessions = await countSessions(homegameId);
          if (!cancelled) setSessionCount(sessions);
          return;
        }
        const [players, members, sessions] = await Promise.all([
          headCount(supabase.from('players').select('*', HEAD).eq('homegame_id', homegameId).eq('is_active', true)),
          headCount(supabase.from('homegame_members').select('*', HEAD).eq('homegame_id', homegameId)),
          countSessions(homegameId),
        ]);
        if (cancelled) return;
        setCounts({ players, members, sessions });
        setSessionCount(sessions);
      } catch (err) {
        // The checklist is a nudge, not essential: on failure it just stays hidden.
        console.error('Error loading getting started counts:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [homegameId, isOwner, isNew]);

  const checklist = useMemo(
    () =>
      counts
        ? getChecklist({
            createdAt,
            isOwner,
            playerCount: counts.players,
            memberCount: counts.members,
            sessionCount: counts.sessions,
            inviteShared,
          })
        : HIDDEN,
    [counts, createdAt, isOwner, inviteShared]
  );

  /** The card calls this after copying or sharing the invite, so the item ticks at once. */
  const onInviteShared = useCallback(() => setInviteShared(true), []);

  return { checklist, sessionCount, onInviteShared };
}

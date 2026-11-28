import { useCallback, useState } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';

export type TipId = 'home-plus' | 'mystats-member';

/**
 * One-time tips, remembered on the account (profiles.seen_tips) so a tip seen
 * on one device stays dismissed on every other. A profile without the column
 * (frontend deployed before the migration) counts as having seen every tip:
 * nothing shows and nothing is written.
 */
export function useTips() {
  const { profile, updateProfile } = useAuthContext();
  // Hides a dismissed tip at once, before the profile save comes back.
  const [dismissed, setDismissed] = useState<TipId[]>([]);

  const tipsStored = !!profile && profile.seen_tips !== undefined;

  const shouldShow = useCallback(
    (id: TipId) => tipsStored && !(profile?.seen_tips ?? []).includes(id) && !dismissed.includes(id),
    [tipsStored, profile, dismissed]
  );

  const markSeen = useCallback(
    async (id: TipId) => {
      setDismissed((d) => (d.includes(id) ? d : [...d, id]));
      const seen = profile?.seen_tips ?? [];
      if (!profile || !tipsStored || seen.includes(id)) return;
      await updateProfile({ seen_tips: [...seen, id] });
    },
    [profile, tipsStored, updateProfile]
  );

  return { shouldShow, markSeen };
}

/** The old icon tours kept their "seen" flags in localStorage; drop them. */
export function clearLegacyTourKeys() {
  try {
    localStorage.removeItem('tutorial_owner_seen');
    localStorage.removeItem('tutorial_player_seen');
  } catch {
    // Storage can be blocked (private mode); nothing to clean up then.
  }
}

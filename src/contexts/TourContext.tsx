import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { useLiveSession } from '@/contexts/LiveSessionContext';
import { useTips } from '@/hooks/useTips';
import { isTourEligible, tourRole, type TourRole } from '@/lib/onboarding/tour';

interface TourValue {
  open: boolean;
  /** The card set, fixed from the homegame at the moment the tour opened. */
  role: TourRole;
  /** Opens the tour on demand (the menu row), whoever the account is. */
  openTour: () => void;
  /** Skip, scrim, Escape and finishing: closes and records 'tour' as seen. */
  closeTour: () => void;
  /**
   * Called by Home on mount. Opens the tour once per mount for an eligible
   * account, once auth data has loaded and the live-session check is back
   * with no game in progress.
   */
  maybeAutoOpen: () => void;
  /** An eligible account whose auto-open has not been decided yet this mount. */
  autoOpenPending: boolean;
}

const TourContext = createContext<TourValue | null>(null);

export function TourProvider({ children }: { children: ReactNode }) {
  const { profile, homegame, loading, userDataPending } = useAuthContext();
  const { liveSession, loading: liveLoading } = useLiveSession();
  const { markSeen } = useTips();
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<TourRole>(() => tourRole(homegame));
  const [autoRequested, setAutoRequested] = useState(false);
  const [autoDecided, setAutoDecided] = useState(false);

  const authReady = !loading && !userDataPending;

  const openTour = useCallback(() => {
    setRole(tourRole(homegame));
    setOpen(true);
  }, [homegame]);

  const closeTour = useCallback(() => {
    setOpen(false);
    void markSeen('tour');
  }, [markSeen]);

  const maybeAutoOpen = useCallback(() => setAutoRequested(true), []);

  // Decide once: when Home has asked, auth is ready and the live-session fetch
  // is back (so a game in progress is known before the tour can cover it).
  useEffect(() => {
    if (!autoRequested || autoDecided || !authReady || liveLoading) return;
    setAutoDecided(true);
    if (isTourEligible(profile) && !liveSession) openTour();
  }, [autoRequested, autoDecided, authReady, liveLoading, profile, liveSession, openTour]);

  const autoOpenPending = !autoDecided && isTourEligible(profile);

  const value = useMemo(
    () => ({ open, role, openTour, closeTour, maybeAutoOpen, autoOpenPending }),
    [open, role, openTour, closeTour, maybeAutoOpen, autoOpenPending],
  );

  // Task 3 renders <FeatureTour open={open} role={role} onClose={closeTour} /> here.
  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTour(): Omit<TourValue, 'autoOpenPending'> {
  const value = useContext(TourContext);
  if (!value) throw new Error('useTour must be used within a TourProvider');
  return value;
}

/**
 * True while the install sheet and banner must wait for the tour: it is open,
 * or it may still auto-open this visit (so an arrival sheet doesn't show and
 * then get covered). False outside a TourProvider.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useTourHoldsInstall(): boolean {
  const value = useContext(TourContext);
  return !!value && (value.open || value.autoOpenPending);
}

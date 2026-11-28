import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { useLiveSession } from '@/contexts/LiveSessionContext';
import { FeatureTour } from '@/components/tour/FeatureTour';
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
  /** On Home, for an eligible account whose auto-open has not been decided yet this mount. */
  autoOpenPending: boolean;
}

const TourContext = createContext<TourValue | null>(null);

export function TourProvider({ children }: { children: ReactNode }) {
  const { profile, homegame, loading, userDataPending } = useAuthContext();
  const { liveSession, loading: liveLoading } = useLiveSession();
  const { markSeen } = useTips();
  const { pathname } = useLocation();
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

  // A request belongs to the Home visit that made it. Leaving Home before the
  // decision drops it, so the tour never opens over another page; Home asks
  // again on its next mount.
  const onHome = pathname === '/';
  useEffect(() => {
    if (!onHome) setAutoRequested(false);
  }, [onHome]);

  // Decide once: when Home has asked, auth is ready and the live-session fetch
  // is back (so a game in progress is known before the tour can cover it).
  useEffect(() => {
    if (!onHome || !autoRequested || autoDecided || !authReady || liveLoading) return;
    setAutoDecided(true);
    if (isTourEligible(profile) && !liveSession) openTour();
  }, [onHome, autoRequested, autoDecided, authReady, liveLoading, profile, liveSession, openTour]);

  // Only Home auto-opens, so only Home waits for the decision. Elsewhere (e.g. a
  // first one-off save on /one-off) nothing is coming and the sheet shows at once.
  const autoOpenPending = onHome && !autoDecided && isTourEligible(profile);

  const value = useMemo(
    () => ({ open, role, openTour, closeTour, maybeAutoOpen, autoOpenPending }),
    [open, role, openTour, closeTour, maybeAutoOpen, autoOpenPending],
  );

  return (
    <TourContext.Provider value={value}>
      {children}
      <FeatureTour open={open} role={role} onClose={closeTour} />
    </TourContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTour(): Omit<TourValue, 'autoOpenPending'> {
  const value = useContext(TourContext);
  if (!value) throw new Error('useTour must be used within a TourProvider');
  return value;
}

/**
 * True while the install sheet and banner must wait for the tour: it is open,
 * or this is Home and it may still auto-open (so an arrival sheet doesn't show
 * and then get covered). False outside a TourProvider.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useTourHoldsInstall(): boolean {
  const value = useContext(TourContext);
  return !!value && (value.open || value.autoOpenPending);
}

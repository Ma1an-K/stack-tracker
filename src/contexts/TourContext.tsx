import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { useLiveSession } from '@/contexts/LiveSessionContext';
import { FeatureTour } from '@/components/tour/FeatureTour';
import { useTips } from '@/hooks/useTips';
import { isTourEligible, tourRole, type TourRole } from '@/lib/onboarding/tour';

/** How long the sheet takes to slide out (the Sheet primitive's closed duration). */
export const TOUR_EXIT_MS = 300;

/**
 * How long Home gets, after the route opens, to ask for the auto-open before the
 * install sheet and banner stop waiting for it. Covers a slow lazy-route load; if
 * Home never asks (it failed to render), nothing is held for longer than this.
 */
export const HOME_REQUEST_WINDOW_MS = 5000;

interface TourValue {
  open: boolean;
  /** The card set, fixed from the homegame at the moment the tour opened. */
  role: TourRole;
  /** Opens the tour on demand (the menu row), whoever the account is. */
  openTour: () => void;
  /** Skip, scrim, Escape and finishing: closes and records 'tour' as seen. */
  closeTour: () => void;
  /**
   * Called by Home on mount. The auto-open is decided once per shell lifetime
   * (until the next cold start), for an eligible account, once auth data has
   * loaded and a live-session check made during this Home visit is back. If a
   * game is in progress then, it is skipped and not retried until the next
   * cold start.
   */
  maybeAutoOpen: () => void;
  /**
   * The header menu trigger, registered by Header. Closing the tour returns
   * focus there; with nothing registered the sheet's default focus return applies.
   */
  returnFocusRef: MutableRefObject<HTMLElement | null>;
  /**
   * On Home, for an eligible account whose auto-open has not been decided yet:
   * once Home has asked, or within HOME_REQUEST_WINDOW_MS of the visit starting.
   */
  autoOpenPending: boolean;
  /** Just closed: the sheet is still sliding out (TOUR_EXIT_MS). */
  closing: boolean;
}

const TourContext = createContext<TourValue | null>(null);

export function TourProvider({ children }: { children: ReactNode }) {
  const { profile, homegame, loading, userDataPending } = useAuthContext();
  const { liveSession, loading: liveLoading, fetchCount: liveFetches } = useLiveSession();
  const { markSeen, shouldShow } = useTips();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [role, setRole] = useState<TourRole>(() => tourRole(homegame));
  const [autoRequested, setAutoRequested] = useState(false);
  const [autoDecided, setAutoDecided] = useState(false);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const authReady = !loading && !userDataPending;
  // shouldShow also covers a tour closed this session whose save failed, so a
  // replay before the first Home visit can't be followed by an auto-open.
  const eligible = isTourEligible(profile) && shouldShow('tour');

  const openTour = useCallback(() => {
    setRole(tourRole(homegame));
    setClosing(false);
    setOpen(true);
  }, [homegame]);

  const closeTour = useCallback(() => {
    setOpen(false);
    setClosing(true);
    void markSeen('tour');
  }, [markSeen]);

  // The install sheet waits for the tour's slide-out, so the two never animate together.
  useEffect(() => {
    if (!closing) return;
    const t = setTimeout(() => setClosing(false), TOUR_EXIT_MS);
    return () => clearTimeout(t);
  }, [closing]);

  const maybeAutoOpen = useCallback(() => setAutoRequested(true), []);

  // A request belongs to the Home visit that made it. Leaving Home before the
  // decision drops it, so the tour never opens over another page; Home asks
  // again on its next mount.
  const onHome = pathname === '/';
  useEffect(() => {
    if (!onHome) setAutoRequested(false);
  }, [onHome]);

  // Each Home visit starts a new window for Home to ask in, and needs its own
  // live-session answer: the provider re-fetches on '/', and an answer from
  // before the visit may miss a game started since. On a cold start the
  // baseline is 0, so the shell's first fetch counts.
  const [prevOnHome, setPrevOnHome] = useState(onHome);
  const [liveBaseline, setLiveBaseline] = useState(0);
  const [requestWindowOpen, setRequestWindowOpen] = useState(true);
  if (prevOnHome !== onHome) {
    setPrevOnHome(onHome);
    if (onHome) {
      setLiveBaseline(liveFetches);
      setRequestWindowOpen(true);
    }
  }
  useEffect(() => {
    if (!onHome || !requestWindowOpen) return;
    const t = setTimeout(() => setRequestWindowOpen(false), HOME_REQUEST_WINDOW_MS);
    return () => clearTimeout(t);
  }, [onHome, requestWindowOpen]);

  const liveChecked = !liveLoading && liveFetches > liveBaseline;

  // Decide once: when Home has asked, auth is ready and this visit's
  // live-session check is back (so a game in progress is known before the
  // tour can cover it).
  useEffect(() => {
    if (!onHome || !autoRequested || autoDecided || !authReady || !liveChecked) return;
    setAutoDecided(true);
    if (eligible && !liveSession) openTour();
  }, [onHome, autoRequested, autoDecided, authReady, liveChecked, eligible, liveSession, openTour]);

  // Only Home auto-opens, so only Home waits for the decision. Elsewhere (e.g. a
  // first one-off save on /one-off) nothing is coming and the sheet shows at once.
  const autoOpenPending = onHome && !autoDecided && eligible && (autoRequested || requestWindowOpen);

  const value = useMemo(
    () => ({ open, role, openTour, closeTour, maybeAutoOpen, returnFocusRef, autoOpenPending, closing }),
    [open, role, openTour, closeTour, maybeAutoOpen, autoOpenPending, closing],
  );

  return (
    <TourContext.Provider value={value}>
      {children}
      <FeatureTour open={open} role={role} onClose={closeTour} returnFocusRef={returnFocusRef} />
    </TourContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTour(): Omit<TourValue, 'autoOpenPending' | 'closing'> {
  const value = useContext(TourContext);
  if (!value) throw new Error('useTour must be used within a TourProvider');
  return value;
}

/**
 * True while the install sheet and banner must wait for the tour: it is open or
 * still sliding out, or this is Home and it may still auto-open (so an arrival
 * sheet doesn't show and then get covered). False outside a TourProvider.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useTourHoldsInstall(): boolean {
  const value = useContext(TourContext);
  return !!value && (value.open || value.closing || value.autoOpenPending);
}

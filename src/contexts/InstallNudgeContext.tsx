import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { InstallSheet } from '@/components/install/InstallSheet';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { isPhoneContext } from '@/lib/installContext';
import { nudgeState, readNudge, SNOOZE_MS, writeNudge } from '@/lib/installNudge';
import { useTourHoldsInstall } from '@/contexts/TourContext';

export type FirstSuccessKind = 'session' | 'claim' | 'oneoff';

interface InstallNudgeValue {
  /**
   * Call after something works for the first time. Opens the "Keep it one tap away"
   * sheet when it's the account's first of that kind, on a phone that hasn't
   * installed, and the sheet isn't snoozed.
   */
  firstSuccess: (kind: FirstSuccessKind, isAccountFirst: boolean) => void;
  /** Whether the Home banner should show right now (never while the sheet is open). */
  bannerVisible: boolean;
  /** The banner's ×: counts a dismissal and hides it for the rest of this visit. */
  dismissBanner: () => void;
}

const sheetAllowedNow = () => nudgeState(readNudge(), Date.now()).sheetAllowed;

// A closed banner stays away for the rest of this visit and comes back next time,
// until the second close stops it for good.
const HIDDEN_THIS_VISIT = 'install_banner_hidden';

function readHiddenThisVisit() {
  try {
    return sessionStorage.getItem(HIDDEN_THIS_VISIT) === '1';
  } catch {
    return false;
  }
}

function writeHiddenThisVisit() {
  try {
    sessionStorage.setItem(HIDDEN_THIS_VISIT, '1');
  } catch {
    // Storage blocked: it may show again on the next visit to Home.
  }
}

const InstallNudgeContext = createContext<InstallNudgeValue | null>(null);

export function InstallNudgeProvider({ children }: { children: ReactNode }) {
  const onPhone = isPhoneContext(useInstallPrompt().context);
  const [store, setStore] = useState(readNudge);
  const [hiddenThisVisit, setHiddenThisVisit] = useState(readHiddenThisVisit);
  // A first win queued on /welcome opens the sheet as soon as the shell shows.
  const [open, setOpen] = useState(() => onPhone && readNudge().pendingSheet === true && sheetAllowedNow());

  // The feature tour goes first. While it is open (or may still auto-open on Home),
  // a requested sheet is held rather than shown; when the hold lifts it shows,
  // unless the snooze rules say no by then. Deriving visibility from the hold
  // means an arrival sheet never flashes up and then sits stacked with the tour.
  const tourHolds = useTourHoldsInstall();
  const [prevTourHolds, setPrevTourHolds] = useState(tourHolds);
  if (prevTourHolds !== tourHolds) {
    setPrevTourHolds(tourHolds);
    if (!tourHolds && open && !sheetAllowedNow()) setOpen(false);
  }
  const sheetOpen = open && !tourHolds;

  // A queued arrival sheet stays queued until it actually shows, so a reload while
  // it is held behind the tour doesn't lose it. If it won't show (not a phone,
  // snoozed, or dropped by the snooze rules when the hold lifts) it is dequeued.
  useEffect(() => {
    if ((sheetOpen || !open) && readNudge().pendingSheet) setStore(writeNudge({ pendingSheet: false }));
  }, [sheetOpen, open]);

  const firstSuccess = useCallback(
    (_kind: FirstSuccessKind, isAccountFirst: boolean) => {
      if (isAccountFirst && onPhone && sheetAllowedNow()) setOpen(true);
    },
    [onPhone],
  );

  // Any way of closing the sheet ("Not now", the scrim, Escape) snoozes it, and the banner with it.
  const close = useCallback(() => {
    setStore(writeNudge({ snoozedUntil: Date.now() + SNOOZE_MS }));
    setOpen(false);
  }, []);

  const dismissBanner = useCallback(() => {
    setStore(writeNudge({ bannerDismissals: (readNudge().bannerDismissals ?? 0) + 1 }));
    writeHiddenThisVisit();
    setHiddenThisVisit(true);
  }, []);

  const bannerVisible = !open && !tourHolds && !hiddenThisVisit && nudgeState(store, Date.now()).bannerVisible;

  const value = useMemo(
    () => ({ firstSuccess, bannerVisible, dismissBanner }),
    [firstSuccess, bannerVisible, dismissBanner],
  );

  return (
    <InstallNudgeContext.Provider value={value}>
      {children}
      <InstallSheet open={sheetOpen} onClose={close} />
    </InstallNudgeContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useInstallNudge(): InstallNudgeValue {
  const value = useContext(InstallNudgeContext);
  const onPhone = isPhoneContext(useInstallPrompt().context);
  if (value) return value;
  // Outside the app shell (the /welcome pages) there is no provider, so a first win
  // there is queued and the provider opens the sheet when the shell mounts.
  return {
    firstSuccess: (_kind, isAccountFirst) => {
      if (isAccountFirst && onPhone && sheetAllowedNow()) writeNudge({ pendingSheet: true });
    },
    bannerVisible: false,
    dismissBanner: () => {},
  };
}

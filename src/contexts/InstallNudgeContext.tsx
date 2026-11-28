import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { InstallSheet } from '@/components/install/InstallSheet';
import { nudgeState, readNudge, SNOOZE_MS, writeNudge } from '@/lib/installNudge';

export type FirstSuccessKind = 'session' | 'claim' | 'oneoff';

interface InstallNudgeValue {
  /**
   * Call after something works for the first time. Opens the "Keep it one tap away"
   * sheet when it's the account's first of that kind and the sheet isn't snoozed.
   */
  firstSuccess: (kind: FirstSuccessKind, isAccountFirst: boolean) => void;
  /** The sheet is showing, so the Home banner stays out of the way. */
  sheetOpen: boolean;
}

const sheetAllowedNow = () => nudgeState(readNudge(), Date.now()).sheetAllowed;

// Outside the app shell (the /welcome pages) there is no provider, so a first win
// there is queued and the provider opens the sheet when the shell mounts.
const InstallNudgeContext = createContext<InstallNudgeValue>({
  firstSuccess: (_kind, isAccountFirst) => {
    if (isAccountFirst && sheetAllowedNow()) writeNudge({ pendingSheet: true });
  },
  sheetOpen: false,
});

export function InstallNudgeProvider({ children }: { children: ReactNode }) {
  // A first win queued on /welcome opens the sheet as soon as the shell shows.
  const [open, setOpen] = useState(() => readNudge().pendingSheet === true && sheetAllowedNow());

  useEffect(() => {
    if (readNudge().pendingSheet) writeNudge({ pendingSheet: false });
  }, []);

  const firstSuccess = useCallback((_kind: FirstSuccessKind, isAccountFirst: boolean) => {
    if (isAccountFirst && sheetAllowedNow()) setOpen(true);
  }, []);

  // Any way of closing the sheet ("Not now", the scrim, Escape) snoozes it.
  const close = useCallback(() => {
    writeNudge({ snoozedUntil: Date.now() + SNOOZE_MS });
    setOpen(false);
  }, []);

  const value = useMemo(() => ({ firstSuccess, sheetOpen: open }), [firstSuccess, open]);

  return (
    <InstallNudgeContext.Provider value={value}>
      {children}
      <InstallSheet open={open} onClose={close} />
    </InstallNudgeContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useInstallNudge(): InstallNudgeValue {
  return useContext(InstallNudgeContext);
}

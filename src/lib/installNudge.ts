/**
 * When to ask again about installing: the second ask (a bottom sheet after a
 * first win) and the Home banner. Kept in localStorage on purpose, because
 * installing is per device.
 */

export const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;
export const MAX_BANNER_DISMISSALS = 2;
const KEY = 'install_nudge';

export interface InstallNudgeStore {
  /** "Not now" on the sheet hides the sheet and the banner until this time. */
  snoozedUntil?: number;
  /** Closing the banner twice stops it for good. */
  bannerDismissals?: number;
  /** A first win happened outside the app shell (e.g. a claim on /welcome); show the sheet on arrival. */
  pendingSheet?: boolean;
}

export function nudgeState(
  store: InstallNudgeStore,
  now: number,
): { sheetAllowed: boolean; bannerVisible: boolean } {
  const snoozed = (store.snoozedUntil ?? 0) > now;
  return {
    sheetAllowed: !snoozed,
    // "After that, a slim banner": a fresh "Not now" also quiets the banner for the snooze.
    bannerVisible: !snoozed && (store.bannerDismissals ?? 0) < MAX_BANNER_DISMISSALS,
  };
}

export function readNudge(): InstallNudgeStore {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? (parsed as InstallNudgeStore) : {};
  } catch {
    return {};
  }
}

export function writeNudge(patch: InstallNudgeStore): InstallNudgeStore {
  const next = { ...readNudge(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage blocked: the nudge just shows again next time.
  }
  return next;
}

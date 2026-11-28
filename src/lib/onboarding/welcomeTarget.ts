export type WelcomeTarget = '/' | '/welcome' | '/welcome/join';

export interface WelcomeTargetInput {
  homegameCount: number;
  pendingCode: string | null;
  hasSeenWelcome: boolean;
  /** The memberships query failed, so homegameCount 0 is unknown, not "none". */
  membershipsFailed?: boolean;
}

/**
 * Where a user goes right after signing in. Anyone in a homegame goes home
 * (a signed-in member with an invite is offered the join dialog there). An
 * invite on this device beats the choice screen, even one already seen.
 * Otherwise the choice screen shows once; after any choice, home. If the
 * homegames couldn't be loaded, home too: never first-run on a guess.
 */
export function welcomeTarget({ homegameCount, pendingCode, hasSeenWelcome, membershipsFailed }: WelcomeTargetInput): WelcomeTarget {
  if (homegameCount > 0 || membershipsFailed) return '/';
  if (pendingCode) return '/welcome/join';
  return hasSeenWelcome ? '/' : '/welcome';
}

const WELCOME_SEEN_KEY = 'welcome_seen';

export function hasSeenWelcome(): boolean {
  try {
    return localStorage.getItem(WELCOME_SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

/** Set when any choice on the welcome screen is tapped. */
export function markWelcomeSeen(): void {
  try {
    localStorage.setItem(WELCOME_SEEN_KEY, '1');
  } catch {
    /* storage unavailable: the choice screen shows again next sign-in */
  }
}

/** Cleared on sign-out, so another account on this device gets its own first run. */
export function clearWelcomeSeen(): void {
  try {
    localStorage.removeItem(WELCOME_SEEN_KEY);
  } catch {
    /* storage unavailable: nothing to clear */
  }
}

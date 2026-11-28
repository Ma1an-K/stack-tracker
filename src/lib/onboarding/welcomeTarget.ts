export type WelcomeTarget = '/' | '/welcome' | '/welcome/join';

export interface WelcomeTargetInput {
  homegameCount: number;
  pendingCode: string | null;
  hasSeenWelcome: boolean;
}

/**
 * Where a user goes right after signing in. Anyone in a homegame goes home
 * (a signed-in member with an invite is offered the join dialog there). An
 * invite on this device beats the choice screen, even one already seen.
 * Otherwise the choice screen shows once; after any choice, home.
 */
export function welcomeTarget({ homegameCount, pendingCode, hasSeenWelcome }: WelcomeTargetInput): WelcomeTarget {
  if (homegameCount > 0) return '/';
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

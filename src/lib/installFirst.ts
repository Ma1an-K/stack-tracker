import { isPhoneContext, type InstallContext } from './installContext';

const CONTINUE_KEY = 'continue_in_browser';

export interface InstallFirstInput {
  context: InstallContext;
  signedIn: boolean;
  /** They chose "Continue in browser" this visit. */
  continued: boolean;
  /** They asked for the full page ("Learn more", `/?learn=1`). */
  learn: boolean;
}

/**
 * Whether a signed-out phone visitor should see the install-first landing instead
 * of the marketing or sign-up page. Installing first matters on iPhone: a Home
 * Screen app doesn't share sign-in with Safari, so they'd have to sign in twice.
 */
export function showInstallFirst({ context, signedIn, continued, learn }: InstallFirstInput): boolean {
  return isPhoneContext(context) && !signedIn && !continued && !learn;
}

export function hasContinuedInBrowser(): boolean {
  try {
    return sessionStorage.getItem(CONTINUE_KEY) === '1';
  } catch {
    return false;
  }
}

export function markContinuedInBrowser(): void {
  try {
    sessionStorage.setItem(CONTINUE_KEY, '1');
  } catch {
    /* storage unavailable: the choice holds until this page reloads */
  }
}

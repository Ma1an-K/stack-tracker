/**
 * Where the app is running, for deciding which install help to show.
 * Pure: the caller gathers the environment (see useInstallPrompt).
 */
export type InstallContext =
  | 'native'
  | 'installed'
  | 'in-app'
  | 'ios-safari'
  | 'ios-other'
  | 'android-prompt'
  | 'android-manual'
  | 'desktop';

export interface InstallEnv {
  ua: string;
  maxTouchPoints: number;
  standalone: boolean;
  native: boolean;
  hasPrompt: boolean;
}

// Social and chat apps that open links in their own webview, where
// "Add to Home Screen" is unavailable.
const IN_APP_BROWSER = /FBAN|FBAV|Instagram|WhatsApp|Line\/|MicroMessenger|Snapchat|TikTok|LinkedInApp/;
// Third-party browsers on iOS (all WebKit, but only Safari can add to Home Screen
// in the way our instructions describe).
const IOS_OTHER_BROWSER = /CriOS|FxiOS|EdgiOS/;

export function getInstallContext(env: InstallEnv): InstallContext {
  const { ua } = env;
  if (env.native) return 'native';
  if (env.standalone) return 'installed';
  if (IN_APP_BROWSER.test(ua)) return 'in-app';

  // iPadOS Safari reports a Macintosh UA by default; a touch screen gives it away.
  const isIOS = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && env.maxTouchPoints > 1);
  if (isIOS) return IOS_OTHER_BROWSER.test(ua) ? 'ios-other' : 'ios-safari';

  if (/Android/.test(ua)) return env.hasPrompt ? 'android-prompt' : 'android-manual';
  return 'desktop';
}

/** True when the user is on a phone or tablet browser that could install the app. */
export function isPhoneContext(c: InstallContext): boolean {
  return c === 'in-app' || c.startsWith('ios-') || c.startsWith('android-');
}

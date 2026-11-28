import { Capacitor } from '@capacitor/core';

export const SITE_URL = 'https://www.stack-tracker.com';

/** True inside the iOS/Android app, false in a browser. */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Origin for links that leave the device (emails, shared invite links).
 * Inside the app window.location.origin is capacitor://localhost or
 * https://localhost, which means nothing to anyone else, so use the website.
 */
export function publicOrigin(): string {
  return isNativeApp() ? SITE_URL : window.location.origin;
}

/** True when running as an installed web app (launched from the Home Screen). */
export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

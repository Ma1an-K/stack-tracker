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

import { App } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Capacitor } from '@capacitor/core';
import { isNativeApp } from './platform';

/** Native-only setup: status bar, splash screen and the Android back button. */
export async function initNativeShell(): Promise<void> {
  if (!isNativeApp()) return;

  try {
    await StatusBar.setStyle({ style: Style.Dark });
    if (Capacitor.getPlatform() === 'android') {
      await StatusBar.setOverlaysWebView({ overlay: true });
    }
  } catch {
    // Status bar styling is cosmetic; never block startup on it.
  }

  App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) window.history.back();
    else App.exitApp();
  });

  await SplashScreen.hide().catch(() => undefined);
}

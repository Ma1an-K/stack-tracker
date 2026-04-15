// src/hooks/useInstallPrompt.ts
import { useState, useEffect } from 'react';

// BeforeInstallPromptEvent is not in the standard TypeScript DOM lib
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type InstallPlatform = 'android' | 'ios' | 'installed' | 'unsupported';

export interface InstallPromptInfo {
  platform: InstallPlatform;
  trigger: (() => void) | null;
}

export function useInstallPrompt(): InstallPromptInfo {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true;

  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !(window as unknown as { MSStream?: unknown }).MSStream;

  if (isStandalone) return { platform: 'installed', trigger: null };
  if (isIOS) return { platform: 'ios', trigger: null };
  if (deferredPrompt) {
    return {
      platform: 'android',
      trigger: () => {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(() => setDeferredPrompt(null));
      },
    };
  }
  return { platform: 'unsupported', trigger: null };
}

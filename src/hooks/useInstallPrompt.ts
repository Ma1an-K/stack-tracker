// src/hooks/useInstallPrompt.ts
import { useState, useEffect, useRef } from 'react';

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
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      deferredPromptRef.current = e as BeforeInstallPromptEvent;
      forceUpdate(n => n + 1);
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
  if (deferredPromptRef.current) {
    return {
      platform: 'android',
      trigger: () => {
        const prompt = deferredPromptRef.current;
        if (!prompt) return;
        prompt.prompt();
        prompt.userChoice
          .then(() => {
            deferredPromptRef.current = null;
            forceUpdate(n => n + 1);
          })
          .catch(() => {
            deferredPromptRef.current = null;
            forceUpdate(n => n + 1);
          });
      },
    };
  }
  return { platform: 'unsupported', trigger: null };
}

// src/hooks/useInstallPrompt.ts
import { useState, useEffect, useRef } from 'react';
import { getInstallContext, type InstallContext } from '@/lib/installContext';
import { isNativeApp, isStandalone } from '@/lib/platform';

// BeforeInstallPromptEvent is not in the standard TypeScript DOM lib
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface InstallPromptInfo {
  context: InstallContext;
  /** Shows the browser's install prompt; only set when context is 'android-prompt'. */
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

  const context = getInstallContext({
    ua: navigator.userAgent,
    maxTouchPoints: navigator.maxTouchPoints ?? 0,
    standalone: isStandalone(),
    native: isNativeApp(),
    hasPrompt: deferredPromptRef.current !== null,
  });

  if (context !== 'android-prompt') return { context, trigger: null };

  return {
    context,
    trigger: () => {
      const prompt = deferredPromptRef.current;
      if (!prompt) return;
      // The event can only be used once, whatever the user chooses.
      const reset = () => {
        deferredPromptRef.current = null;
        forceUpdate(n => n + 1);
      };
      prompt.prompt();
      prompt.userChoice.then(reset, reset);
    },
  };
}

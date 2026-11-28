// src/hooks/useInstallPrompt.ts
import { useSyncExternalStore } from 'react';
import { getInstallContext, type InstallContext } from '@/lib/installContext';
import { getInstallPrompt, showInstallPrompt, subscribeInstallPrompt } from '@/lib/installPromptStore';
import { isNativeApp, isStandalone } from '@/lib/platform';

export interface InstallPromptInfo {
  context: InstallContext;
  /** Shows the browser's install prompt; only set when context is 'android-prompt'. */
  trigger: (() => void) | null;
}

export function useInstallPrompt(): InstallPromptInfo {
  // One app-wide copy, captured at load: see installPromptStore.
  const prompt = useSyncExternalStore(subscribeInstallPrompt, getInstallPrompt, () => null);

  const context = getInstallContext({
    ua: navigator.userAgent,
    maxTouchPoints: navigator.maxTouchPoints ?? 0,
    standalone: isStandalone(),
    native: isNativeApp(),
    hasPrompt: prompt !== null,
  });

  if (context !== 'android-prompt') return { context, trigger: null };
  // Single use, for every caller: the store forgets it as it shows it.
  return { context, trigger: () => void showInstallPrompt() };
}

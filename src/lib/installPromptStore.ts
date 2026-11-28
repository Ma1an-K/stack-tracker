/**
 * The browser's deferred install prompt (Android Chrome's beforeinstallprompt),
 * held once for the whole app. The event fires once per page load, often before
 * the components that offer installing have mounted, and can be shown only
 * once, so it is captured here at module load (main.tsx imports this first)
 * and every useInstallPrompt reads the same copy.
 */

// BeforeInstallPromptEvent is not in the standard TypeScript DOM lib.
export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function set(next: BeforeInstallPromptEvent | null) {
  deferred = next;
  listeners.forEach((listener) => listener());
}

export function getInstallPrompt(): BeforeInstallPromptEvent | null {
  return deferred;
}

export function subscribeInstallPrompt(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function clearInstallPrompt(): void {
  if (deferred) set(null);
}

/** Shows the browser's install prompt. Single use: false if there is none (left). */
export function showInstallPrompt(): boolean {
  const prompt = deferred;
  if (!prompt) return false;
  // Cleared before prompt(): calling it a second time throws.
  set(null);
  void prompt.prompt().catch(() => {});
  return true;
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    // Keep it for our own button instead of the browser's mini info bar.
    e.preventDefault();
    set(e as BeforeInstallPromptEvent);
  });
  window.addEventListener('appinstalled', clearInstallPrompt);
}

import { describe, it, expect, vi, beforeEach } from 'vitest';

type Store = typeof import('./installPromptStore');

// The browser fires beforeinstallprompt once per page load; a fake one.
function firePrompt() {
  const event = new Event('beforeinstallprompt', { cancelable: true }) as Event & {
    prompt: ReturnType<typeof vi.fn>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
  };
  event.prompt = vi.fn(() => Promise.resolve());
  event.userChoice = Promise.resolve({ outcome: 'dismissed' });
  window.dispatchEvent(event);
  return event;
}

let store: Store;
beforeEach(async () => {
  // A fresh module per test: the store captures at import, like the app does from main.tsx.
  vi.resetModules();
  store = await import('./installPromptStore');
  store.clearInstallPrompt();
});

describe('install prompt store', () => {
  it('captures the event at load and stops the browser showing its own mini bar', () => {
    expect(store.getInstallPrompt()).toBeNull();
    const event = firePrompt();
    expect(store.getInstallPrompt()).toBe(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('tells subscribers when the prompt arrives and when it is used', () => {
    const listener = vi.fn();
    const unsubscribe = store.subscribeInstallPrompt(listener);
    firePrompt();
    expect(listener).toHaveBeenCalledTimes(1);
    store.showInstallPrompt();
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    firePrompt();
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('can be shown only once, for every caller', () => {
    const event = firePrompt();
    expect(store.showInstallPrompt()).toBe(true);
    expect(store.showInstallPrompt()).toBe(false);
    expect(event.prompt).toHaveBeenCalledTimes(1);
    expect(store.getInstallPrompt()).toBeNull();
  });

  it('forgets the prompt once the app is installed', () => {
    firePrompt();
    window.dispatchEvent(new Event('appinstalled'));
    expect(store.getInstallPrompt()).toBeNull();
  });
});

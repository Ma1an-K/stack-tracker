import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const ANDROID_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/131.0 Mobile Safari/537.36';

function firePrompt() {
  const event = new Event('beforeinstallprompt', { cancelable: true }) as Event & {
    prompt: ReturnType<typeof vi.fn>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
  };
  event.prompt = vi.fn(() => Promise.resolve());
  event.userChoice = Promise.resolve({ outcome: 'accepted' });
  window.dispatchEvent(event);
  return event;
}

let useInstallPrompt: typeof import('./useInstallPrompt').useInstallPrompt;
beforeEach(async () => {
  vi.resetModules();
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(ANDROID_UA);
  ({ useInstallPrompt } = await import('./useInstallPrompt'));
  (await import('@/lib/installPromptStore')).clearInstallPrompt();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('useInstallPrompt', () => {
  it('offers the prompt to a component that mounts after the browser fired it', () => {
    firePrompt();
    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.context).toBe('android-prompt');
    expect(result.current.trigger).toBeTypeOf('function');
  });

  it('once used anywhere, no other instance offers it again', () => {
    const event = firePrompt();
    const first = renderHook(() => useInstallPrompt());
    const second = renderHook(() => useInstallPrompt());
    act(() => first.result.current.trigger!());
    expect(event.prompt).toHaveBeenCalledTimes(1);
    expect(first.result.current.context).toBe('android-manual');
    expect(second.result.current.context).toBe('android-manual');
    expect(second.result.current.trigger).toBeNull();
  });
});

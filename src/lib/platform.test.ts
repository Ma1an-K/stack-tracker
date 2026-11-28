import { describe, it, expect, vi, afterEach } from 'vitest';
import { isStandalone } from './platform';

function stubDisplayMode(standalone: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: standalone && query === '(display-mode: standalone)' }));
}

afterEach(() => {
  vi.unstubAllGlobals();
  delete (navigator as Navigator & { standalone?: boolean }).standalone;
});

describe('isStandalone', () => {
  it('is false in a normal browser tab', () => {
    stubDisplayMode(false);
    expect(isStandalone()).toBe(false);
  });

  it('is true for an installed web app (display-mode: standalone)', () => {
    stubDisplayMode(true);
    expect(isStandalone()).toBe(true);
  });

  it('is true for an iOS Home Screen app (navigator.standalone)', () => {
    stubDisplayMode(false);
    Object.defineProperty(navigator, 'standalone', { value: true, configurable: true });
    expect(isStandalone()).toBe(true);
  });
});

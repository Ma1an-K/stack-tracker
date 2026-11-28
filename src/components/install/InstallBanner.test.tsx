import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { InstallContext } from '@/lib/installContext';

let context: InstallContext = 'ios-safari';
vi.mock('@/hooks/useInstallPrompt', () => ({
  useInstallPrompt: () => ({ context, trigger: null }),
}));

import { InstallBanner } from './InstallBanner';
import { InstallNudgeProvider, useInstallNudge } from '@/contexts/InstallNudgeContext';

function memoryStorage(): Storage {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, String(v)),
    removeItem: (k) => void m.delete(k),
    clear: () => m.clear(),
    key: (i) => [...m.keys()][i] ?? null,
    get length() {
      return m.size;
    },
  };
}


const TEXT = 'Put Stack Tracker on your Home Screen';
const renderBanner = () =>
  render(
    <InstallNudgeProvider>
      <InstallBanner />
    </InstallNudgeProvider>,
  );

beforeEach(() => {
  context = 'ios-safari';
  vi.stubGlobal('localStorage', memoryStorage());
  vi.stubGlobal('sessionStorage', memoryStorage());
});
afterEach(() => vi.unstubAllGlobals());

describe('InstallBanner', () => {
  it('shows on a phone that has not installed', () => {
    renderBanner();
    expect(screen.getByText(TEXT)).toBeInTheDocument();
  });

  it('counts a dismissal and hides for this visit', () => {
    renderBanner();
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByText(TEXT)).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('install_nudge')!).bannerDismissals).toBe(1);
  });

  it('comes back on the next visit after one dismissal', () => {
    localStorage.setItem('install_nudge', JSON.stringify({ bannerDismissals: 1 }));
    renderBanner();
    expect(screen.getByText(TEXT)).toBeInTheDocument();
  });

  it('stops for good after two dismissals', () => {
    localStorage.setItem('install_nudge', JSON.stringify({ bannerDismissals: 2 }));
    renderBanner();
    expect(screen.queryByText(TEXT)).not.toBeInTheDocument();
  });

  it('shows nothing once installed', () => {
    context = 'installed';
    renderBanner();
    expect(screen.queryByText(TEXT)).not.toBeInTheDocument();
  });

  it('stays hidden after the sheet over it is closed with "Not now"', () => {
    function Win() {
      const { firstSuccess } = useInstallNudge();
      return <button onClick={() => firstSuccess('claim', true)}>claim</button>;
    }
    render(
      <InstallNudgeProvider>
        <Win />
        <InstallBanner />
      </InstallNudgeProvider>,
    );
    expect(screen.getByText(TEXT)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'claim' }));
    expect(screen.getByText('Keep it one tap away')).toBeInTheDocument();
    expect(screen.queryByText(TEXT)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
    expect(screen.queryByText('Keep it one tap away')).not.toBeInTheDocument();
    expect(screen.queryByText(TEXT)).not.toBeInTheDocument();
  });

  it('shows nothing without the provider', () => {
    render(<InstallBanner />);
    expect(screen.queryByText(TEXT)).not.toBeInTheDocument();
  });
});

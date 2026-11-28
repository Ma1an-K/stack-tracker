import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { InstallContext } from '@/lib/installContext';

let context: InstallContext = 'ios-safari';
vi.mock('@/hooks/useInstallPrompt', () => ({
  useInstallPrompt: () => ({ context, trigger: null }),
}));

import { InstallNudgeProvider, useInstallNudge } from '@/contexts/InstallNudgeContext';
import { SNOOZE_MS } from '@/lib/installNudge';

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


const NOW = 1_800_000_000_000;

function Win({ first }: { first: boolean }) {
  const { firstSuccess } = useInstallNudge();
  return <button onClick={() => firstSuccess('session', first)}>save</button>;
}

function renderWin(first = true) {
  render(
    <>
      <InstallNudgeProvider>
        <Win first={first} />
      </InstallNudgeProvider>
    </>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'save' }));
}

const stored = () => JSON.parse(localStorage.getItem('install_nudge') ?? '{}');

beforeEach(() => {
  context = 'ios-safari';
  vi.stubGlobal('localStorage', memoryStorage());
  vi.spyOn(Date, 'now').mockReturnValue(NOW);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('InstallSheet (second ask)', () => {
  it('opens after the account\'s first win on an iPhone in Safari', () => {
    renderWin();
    expect(screen.getByText('Keep it one tap away')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show me how' }));
    expect(screen.getByText('Add it in three taps')).toBeInTheDocument();
  });

  it('stays closed when it is not the account\'s first', () => {
    renderWin(false);
    expect(screen.queryByText('Keep it one tap away')).not.toBeInTheDocument();
  });

  it('stays closed once installed', () => {
    context = 'installed';
    renderWin();
    expect(screen.queryByText('Keep it one tap away')).not.toBeInTheDocument();
  });

  it('stays closed while snoozed', () => {
    localStorage.setItem('install_nudge', JSON.stringify({ snoozedUntil: NOW + 1000 }));
    renderWin();
    expect(screen.queryByText('Keep it one tap away')).not.toBeInTheDocument();
  });

  it('"Not now" snoozes it for seven days', () => {
    renderWin();
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
    expect(stored().snoozedUntil).toBe(NOW + SNOOZE_MS);
    expect(screen.queryByText('Keep it one tap away')).not.toBeInTheDocument();
  });

  it('opens on arrival for a first win queued outside the app shell', () => {
    // No provider: e.g. a claim sent on /welcome/who.
    function Outside() {
      const { firstSuccess } = useInstallNudge();
      return <button onClick={() => firstSuccess('claim', true)}>claim</button>;
    }
    const { unmount } = render(<Outside />);
    fireEvent.click(screen.getByRole('button', { name: 'claim' }));
    expect(stored().pendingSheet).toBe(true);
    unmount();

    render(
      <>
        <InstallNudgeProvider>
          <p>home</p>
        </InstallNudgeProvider>
      </>,
    );
    expect(screen.getByText('Keep it one tap away')).toBeInTheDocument();
    expect(stored().pendingSheet).toBe(false);
  });
});

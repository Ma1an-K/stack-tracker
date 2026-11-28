import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { InstallContext } from '@/lib/installContext';
import { MemoryRouter } from 'react-router-dom';

let context: InstallContext = 'ios-safari';
vi.mock('@/hooks/useInstallPrompt', () => ({
  useInstallPrompt: () => ({ context, trigger: null }),
}));

const state = vi.hoisted(() => ({
  auth: {} as {
    profile: { created_at: string; seen_tips?: string[] } | null;
    homegame: { role: 'owner' | 'admin' | 'member' } | null;
    loading: boolean;
    userDataPending: boolean;
  },
  live: {} as { liveSession: object | null; loading: boolean },
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuthContext: () => state.auth }));
vi.mock('@/contexts/LiveSessionContext', () => ({ useLiveSession: () => state.live }));
vi.mock('@/hooks/useTips', () => ({ useTips: () => ({ markSeen: vi.fn(), shouldShow: () => false }) }));
// The tour sheet is modal and would hide these controls; this file tests the ordering, not the sheet.
vi.mock('@/components/tour/FeatureTour', () => ({ FeatureTour: () => null }));

import { InstallNudgeProvider, useInstallNudge } from './InstallNudgeContext';
import { TourProvider, useTour } from './TourContext';
import { InstallBanner } from '@/components/install/InstallBanner';

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

const SHEET = 'Keep it one tap away';
const BANNER = 'Put Stack Tracker on your Home Screen';
const NOW = 1_800_000_000_000;
const NEW = { created_at: '2026-11-29T10:00:00Z', seen_tips: [] as string[] };
const OLD = { created_at: '2026-10-01T10:00:00Z', seen_tips: [] as string[] };

function Controls() {
  const { open, openTour, closeTour, maybeAutoOpen } = useTour();
  const { firstSuccess } = useInstallNudge();
  return (
    <>
      <p>{open ? 'tour open' : 'tour closed'}</p>
      <button onClick={openTour}>open tour</button>
      <button onClick={closeTour}>close tour</button>
      <button onClick={maybeAutoOpen}>auto tour</button>
      <button onClick={() => firstSuccess('claim', true)}>claim</button>
      <button onClick={() => firstSuccess('oneoff', true)}>save one-off</button>
    </>
  );
}

const renderShell = (path = '/') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <TourProvider>
        <InstallNudgeProvider>
          <Controls />
          <InstallBanner />
        </InstallNudgeProvider>
      </TourProvider>
    </MemoryRouter>,
  );

const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
const stored = () => JSON.parse(localStorage.getItem('install_nudge') ?? '{}');

beforeEach(() => {
  context = 'ios-safari';
  state.auth = { profile: OLD, homegame: { role: 'owner' }, loading: false, userDataPending: false };
  state.live = { liveSession: null, loading: false };
  vi.stubGlobal('localStorage', memoryStorage());
  vi.stubGlobal('sessionStorage', memoryStorage());
  vi.spyOn(Date, 'now').mockReturnValue(NOW);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('InstallNudgeProvider with the tour', () => {
  it('holds a first win while the tour is open and opens the sheet after it closes', () => {
    renderShell();
    click('open tour');
    click('claim');
    expect(screen.queryByText(SHEET)).not.toBeInTheDocument();

    click('close tour');
    expect(screen.getByText(SHEET)).toBeInTheDocument();
  });

  it('drops a held sheet if it was snoozed by the time the tour closes', () => {
    renderShell();
    click('open tour');
    click('claim');
    localStorage.setItem('install_nudge', JSON.stringify({ snoozedUntil: NOW + 1000 }));

    click('close tour');
    expect(screen.queryByText(SHEET)).not.toBeInTheDocument();
    // And it does not come back if the tour is replayed and closed again.
    localStorage.setItem('install_nudge', JSON.stringify({}));
    click('open tour');
    click('close tour');
    expect(screen.queryByText(SHEET)).not.toBeInTheDocument();
  });

  it('holds the arrival sheet behind an auto-opened tour', () => {
    state.auth.profile = NEW;
    localStorage.setItem('install_nudge', JSON.stringify({ pendingSheet: true }));
    renderShell();
    // Home has not called maybeAutoOpen yet (lazy route), but the sheet already waits.
    expect(screen.queryByText(SHEET)).not.toBeInTheDocument();
    expect(stored().pendingSheet).toBe(false);

    click('auto tour');
    expect(screen.getByText('tour open')).toBeInTheDocument();
    expect(screen.queryByText(SHEET)).not.toBeInTheDocument();

    click('close tour');
    expect(screen.getByText(SHEET)).toBeInTheDocument();
  });

  it('shows the arrival sheet once the auto-open decides not to open', () => {
    state.auth.profile = NEW;
    state.live = { liveSession: { id: 'ls1' }, loading: false };
    localStorage.setItem('install_nudge', JSON.stringify({ pendingSheet: true }));
    renderShell();
    expect(screen.queryByText(SHEET)).not.toBeInTheDocument();

    click('auto tour');
    expect(screen.getByText('tour closed')).toBeInTheDocument();
    expect(screen.getByText(SHEET)).toBeInTheDocument();
  });

  it('shows the arrival sheet at once for an account the tour never auto-opens for', () => {
    localStorage.setItem('install_nudge', JSON.stringify({ pendingSheet: true }));
    renderShell();
    expect(screen.getByText(SHEET)).toBeInTheDocument();
  });

  it('shows a first one-off save at once off Home for an eligible account (no tour coming there)', () => {
    // "Just settle tonight" from /welcome lands on /one-off; Home never called maybeAutoOpen.
    state.auth.profile = NEW;
    renderShell('/one-off/settle');
    expect(screen.getByText('tour closed')).toBeInTheDocument();
    click('save one-off');
    expect(screen.getByText(SHEET)).toBeInTheDocument();
  });

  it('shows an arrival sheet at once off Home for an eligible account', () => {
    state.auth.profile = NEW;
    localStorage.setItem('install_nudge', JSON.stringify({ pendingSheet: true }));
    renderShell('/one-off');
    expect(screen.getByText(SHEET)).toBeInTheDocument();
  });

  it('hides the banner while the tour is open', () => {
    renderShell();
    expect(screen.getByText(BANNER)).toBeInTheDocument();

    click('open tour');
    expect(screen.queryByText(BANNER)).not.toBeInTheDocument();

    click('close tour');
    expect(screen.getByText(BANNER)).toBeInTheDocument();
  });
});

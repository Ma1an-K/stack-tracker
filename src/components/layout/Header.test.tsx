import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { OneOffGame } from '@/lib/oneOff/types';

let game: OneOffGame | null = null;

vi.mock('@/contexts/AuthContext', () => ({
  useAuthContext: () => ({
    homegame: { id: 'hg-1', name: 'Friday game', icon_id: null, disabled_badges: [] },
    homegames: [],
    profile: null,
    isOwner: false,
    signOut: vi.fn(),
    selectHomegame: vi.fn(),
    updateProfile: vi.fn(),
    updateHomegame: vi.fn(),
    deleteHomegame: vi.fn(),
  }),
}));

vi.mock('@/contexts/OneOffGameContext', () => ({
  useOneOffGame: () => ({ game, seatedCount: game?.players.length ?? 0 }),
}));

vi.mock('@/hooks/usePushNotifications', () => ({
  usePushNotifications: () => ({ isSubscribed: false, isSupported: false, subscribe: vi.fn(), unsubscribe: vi.fn() }),
}));

vi.mock('@/hooks/useMediaQuery', () => ({
  useIsDesktop: () => false,
}));

vi.mock('@/lib/inviteLink', () => ({
  readPendingCode: () => null,
  clearPendingCode: vi.fn(),
}));

vi.mock('./HomegameDialog', () => ({
  HomegameDialog: () => null,
}));

import { Header } from './Header';

function makeGame(count: number): OneOffGame {
  return {
    version: 1,
    mode: 'live',
    label: '',
    played_on: '2026-11-26',
    currency: '$',
    notes: '',
    default_buy_in: 50,
    started_at: '2026-11-26T08:00:00.000Z',
    players: Array.from({ length: count }, (_, i) => ({ id: `p${i}`, name: `P${i}`, buy_in: 50, cash_out: null })),
    payments: [],
  };
}

function renderHeader() {
  render(
    <MemoryRouter initialEntries={['/']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/" element={<Header />} />
        <Route path="/one-off" element={<p>One-off hub</p>} />
      </Routes>
    </MemoryRouter>
  );
}

function openClub() {
  fireEvent.click(screen.getByRole('button', { name: 'Club menu and settings' }));
}

describe('Header club menu one-off tile', () => {
  beforeEach(() => {
    game = null;
  });

  it('shows "One-off" to a non-owner when no game is in progress', async () => {
    renderHeader();
    openClub();
    expect(screen.getByRole('button', { name: 'One-off' })).toBeInTheDocument();
  });

  it('shows "Resume game" with the player count when a game is in progress', async () => {
    game = makeGame(5);
    renderHeader();
    openClub();
    expect(screen.getByRole('button', { name: 'Resume game · 5' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'One-off' })).not.toBeInTheDocument();
  });

  it('navigates to /one-off when clicked', async () => {
    renderHeader();
    openClub();
    fireEvent.click(screen.getByRole('button', { name: 'One-off' }));
    expect(await screen.findByText('One-off hub')).toBeInTheDocument();
  });
});

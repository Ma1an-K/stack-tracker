import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { OneOffGame } from '@/lib/oneOff/types';

let liveSession: { id: string } | null = null;
let game: OneOffGame | null = null;
let isDesktop = false;

vi.mock('@/contexts/LiveSessionContext', () => ({
  useLiveSession: () => ({ liveSession }),
}));

vi.mock('@/contexts/OneOffGameContext', () => ({
  useOneOffGame: () => ({ game, seatedCount: game?.players.length ?? 0 }),
}));

vi.mock('@/hooks/useMediaQuery', () => ({
  useIsDesktop: () => isDesktop,
}));

import { Navigation } from './Navigation';

function makeGame(mode: 'live' | 'totals'): OneOffGame {
  return {
    version: 1,
    mode,
    label: '',
    played_on: '2026-11-26',
    currency: '$',
    notes: '',
    default_buy_in: 50,
    started_at: '2026-11-26T08:00:00.000Z',
    players: [
      { id: 'a', name: 'Ann', buy_in: 50, cash_out: null },
      { id: 'b', name: 'Ben', buy_in: 50, cash_out: null },
    ],
    payments: [],
  };
}

function renderNav() {
  render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Navigation />
    </MemoryRouter>
  );
}

describe('Navigation centre button', () => {
  beforeEach(() => {
    liveSession = null;
    game = null;
    isDesktop = false;
  });

  it('goes to /new-session when nothing is running', () => {
    renderNav();
    const link = screen.getByRole('link', { name: 'New session' });
    expect(link).toHaveAttribute('href', '/new-session');
    expect(link).toHaveTextContent('New');
  });

  it('opens a live-mode one-off at /one-off/live', () => {
    game = makeGame('live');
    renderNav();
    const link = screen.getByRole('link', { name: 'Open live game' });
    expect(link).toHaveAttribute('href', '/one-off/live');
    expect(link).toHaveTextContent('Live');
  });

  it('opens a totals-mode one-off at /one-off/settle', () => {
    game = makeGame('totals');
    renderNav();
    const link = screen.getByRole('link', { name: 'Open live game' });
    expect(link).toHaveAttribute('href', '/one-off/settle');
    expect(link).toHaveTextContent('Live');
  });

  it('prefers the homegame live session when both are running', () => {
    liveSession = { id: 's1' };
    game = makeGame('live');
    renderNav();
    const link = screen.getByRole('link', { name: 'Open live game' });
    expect(link).toHaveAttribute('href', '/live-session');
  });

  it('points the desktop button at the one-off when only it is running', () => {
    isDesktop = true;
    game = makeGame('totals');
    renderNav();
    const link = screen.getByRole('link', { name: /back to live game/i });
    expect(link).toHaveAttribute('href', '/one-off/settle');
  });

  it('keeps the desktop button on /new-session when nothing is running', () => {
    isDesktop = true;
    renderNav();
    expect(screen.getByRole('link', { name: /new session/i })).toHaveAttribute('href', '/new-session');
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import type { OneOffGame, SavedOneOffGame } from '@/lib/oneOff/types';

let games: SavedOneOffGame[] = [];
let game: OneOffGame | null = null;

vi.mock('@/contexts/AuthContext', () => ({
  useAuthContext: () => ({
    user: { id: 'user-1' },
    profile: { id: 'user-1', display_name: 'Sam', username: 'sam' },
    homegame: null,
    homegames: [],
    isOwner: false,
    selectHomegame: vi.fn(),
  }),
}));

vi.mock('@/contexts/OneOffGameContext', () => ({
  useOneOffGame: () => ({ game, storageOk: true, totalBuyIn: 0, start: vi.fn(() => ({ error: null })), dispatch: vi.fn(), discard: vi.fn() }),
}));

vi.mock('@/contexts/LiveSessionContext', () => ({
  useLiveSession: () => ({ liveSession: null }),
}));

vi.mock('@/hooks/useSavedOneOffGames', () => ({
  useSavedOneOffGames: () => ({ games, loading: false }),
}));

// The tab pages must not reach the network without a homegame; fail loudly if they try.
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => {
      throw new Error('unexpected query without a homegame');
    },
    channel: () => ({ on: () => ({ subscribe: () => ({}) }) }),
    removeChannel: vi.fn(),
  },
}));

import { NoHomegameHome } from './NoHomegameHome';
import { SessionsPage } from '@/pages/SessionsPage';
import { LeaderboardPage } from '@/pages/LeaderboardPage';
import { PlayersPage } from '@/pages/PlayersPage';

function renderAt(ui: ReactNode) {
  render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>{ui}</MemoryRouter>);
}

const saved: SavedOneOffGame = {
  id: 'g1',
  played_on: '2026-11-27',
  label: 'Tonight',
  currency: '$',
  notes: null,
  players: [
    { id: 'a', name: 'Ann', buy_in: 50, cash_out: 70 },
    { id: 'b', name: 'Ben', buy_in: 50, cash_out: 30 },
  ],
  payments: [],
  transfers: [],
  created_at: '2026-11-27T10:00:00.000Z',
};

beforeEach(() => {
  games = [];
  game = null;
});

describe('NoHomegameHome', () => {
  it('leads with the two quick-game actions and the start-or-join card', () => {
    renderAt(<NoHomegameHome />);
    expect(screen.getByRole('heading', { name: 'Sam' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start live game/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /enter final totals/i })).toBeInTheDocument();
    expect(screen.getByText('Play with the same crew?')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Start a homegame' })).toHaveAttribute('href', '/welcome/host');
    expect(screen.getByRole('link', { name: 'Join with code' })).toHaveAttribute('href', '/welcome/join');
  });

  it('opens the one-off start dialog in totals mode from "Enter final totals"', () => {
    renderAt(<NoHomegameHome />);
    fireEvent.click(screen.getByRole('button', { name: /enter final totals/i }));
    expect(screen.getByRole('dialog', { name: 'Enter final totals' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Default buy-in')).not.toBeInTheDocument();
  });

  it('shows the empty saved-games state', () => {
    renderAt(<NoHomegameHome />);
    expect(screen.getByText('No saved games yet')).toBeInTheDocument();
  });

  it('lists saved games, linking to each one', () => {
    games = [saved];
    renderAt(<NoHomegameHome />);
    expect(screen.queryByText('No saved games yet')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /tonight/i })).toHaveAttribute('href', '/one-off/saved/g1');
  });

  it('offers Resume instead of new games while a one-off is in progress', () => {
    game = {
      version: 1,
      mode: 'live',
      label: '',
      played_on: '2026-11-28',
      currency: '$',
      notes: '',
      default_buy_in: 50,
      started_at: '2026-11-28T08:00:00.000Z',
      players: [
        { id: 'a', name: 'Ann', buy_in: 50, cash_out: null },
        { id: 'b', name: 'Ben', buy_in: 50, cash_out: null },
      ],
      payments: [],
    };
    renderAt(<NoHomegameHome />);
    expect(screen.getByRole('link', { name: /resume/i })).toHaveAttribute('href', '/one-off/live');
    expect(screen.getByRole('button', { name: /start live game/i })).toBeDisabled();
  });
});

describe('homegame tabs without a homegame', () => {
  it.each([
    ['SessionsPage', SessionsPage],
    ['LeaderboardPage', LeaderboardPage],
    ['PlayersPage', PlayersPage],
  ])('%s shows the start-or-join card', (_name, Page) => {
    renderAt(<Page />);
    expect(screen.getByText('Play with the same crew?')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Start a homegame' })).toHaveAttribute('href', '/welcome/host');
  });
});

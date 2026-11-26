import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { OneOffGame, SavedOneOffGame } from '@/lib/oneOff/types';

let game: OneOffGame | null = null;
let storageOk = true;
let games: SavedOneOffGame[] = [];

vi.mock('@/contexts/OneOffGameContext', () => ({
  useOneOffGame: () => ({
    game,
    storageOk,
    seatedCount: game?.players.length ?? 0,
    totalBuyIn: 0,
    totalPot: 0,
    start: vi.fn(() => ({ error: null })),
    dispatch: vi.fn(() => ({ error: null })),
    discard: vi.fn(),
  }),
}));

vi.mock('@/hooks/useOneOffHistory', () => ({
  useOneOffHistory: () => ({
    games,
    loading: false,
    refetch: vi.fn(),
    get: vi.fn(),
    save: vi.fn(),
    remove: vi.fn(),
  }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuthContext: () => ({ user: { id: 'user-1' }, homegame: { currency: '$' } }),
}));

import { OneOffHubPage } from './OneOffHubPage';

const liveGame: OneOffGame = {
  version: 1,
  mode: 'live',
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

function renderHub() {
  render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <OneOffHubPage />
    </MemoryRouter>
  );
}

beforeEach(() => {
  game = null;
  storageOk = true;
  games = [];
});

describe('OneOffHubPage', () => {
  it('with a game in progress shows Resume and disables both start buttons', () => {
    game = liveGame;
    renderHub();
    expect(screen.getByRole('link', { name: /resume/i })).toHaveAttribute('href', '/one-off/live');
    expect(screen.getByRole('button', { name: /start live game/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /enter final totals/i })).toBeDisabled();
  });

  it('resumes a totals game on the settle screen', () => {
    game = { ...liveGame, mode: 'totals' };
    renderHub();
    expect(screen.getByRole('link', { name: /resume/i })).toHaveAttribute('href', '/one-off/settle');
  });

  it('enables the start buttons when nothing is in progress', () => {
    renderHub();
    expect(screen.queryByRole('link', { name: /resume/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start live game/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /enter final totals/i })).toBeEnabled();
  });

  it('warns when the game cannot be kept on this device', () => {
    game = liveGame;
    storageOk = false;
    renderHub();
    expect(screen.getByText('This game is only kept until you close or refresh this page.')).toBeInTheDocument();
  });

  it('lists saved games with label (or a default) and player count, linking to each', () => {
    games = [
      {
        id: 'g1', played_on: '2026-11-20', label: "Dan's place", currency: '$', notes: null,
        players: [
          { id: 'a', name: 'Ann', buy_in: 50, cash_out: 60 },
          { id: 'b', name: 'Ben', buy_in: 50, cash_out: 40 },
          { id: 'c', name: 'Cy', buy_in: 0, cash_out: 0 },
        ],
        payments: [], transfers: [], created_at: '2026-11-20T10:00:00Z',
      },
      {
        id: 'g2', played_on: '2026-11-10', label: null, currency: '$', notes: null,
        players: [
          { id: 'a', name: 'Ann', buy_in: 50, cash_out: 50 },
          { id: 'b', name: 'Ben', buy_in: 50, cash_out: 50 },
        ],
        payments: [], transfers: [], created_at: '2026-11-10T10:00:00Z',
      },
    ];
    renderHub();
    expect(screen.getByRole('link', { name: /Dan's place/ })).toHaveAttribute('href', '/one-off/saved/g1');
    expect(screen.getByText('3 players')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /One-off game/ })).toHaveAttribute('href', '/one-off/saved/g2');
  });
});

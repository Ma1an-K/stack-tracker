import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import type { SavedOneOffGame } from '@/lib/oneOff/types';

const fetchOne = vi.fn();
const hookOptions = vi.fn();

vi.mock('@/hooks/useOneOffHistory', () => ({
  useOneOffHistory: (options?: unknown) => {
    hookOptions(options);
    return { games: [], loading: false, refetch: vi.fn(), get: vi.fn(), fetchOne, save: vi.fn(), remove: vi.fn() };
  },
}));

import { SavedOneOffPage } from './SavedOneOffPage';

const saved: SavedOneOffGame = {
  id: 'g1',
  played_on: '2026-11-20',
  label: "Dan's place",
  currency: 'A$',
  notes: null,
  players: [
    { id: 'ann', name: 'Ann', buy_in: 50, cash_out: 10 },
    { id: 'ben', name: 'Ben', buy_in: 50, cash_out: 90 },
  ],
  payments: [],
  // Stored at save time: shown as is, even if it disagrees with today's math.
  transfers: [{ from_id: 'ann', to_id: 'ben', amount: 39 }],
  created_at: '2026-11-20T10:00:00Z',
};

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/one-off/saved/g1']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/one-off/saved/:id" element={<SavedOneOffPage />} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  fetchOne.mockReset();
  hookOptions.mockReset();
});

describe('SavedOneOffPage', () => {
  it('does not load the saved-games list', async () => {
    fetchOne.mockResolvedValue({ game: saved, error: null });
    renderPage();
    await screen.findByText('Ann pays Ben A$39.00');
    expect(hookOptions).toHaveBeenCalledWith({ loadList: false });
  });

  it('shows the stored transfers', async () => {
    fetchOne.mockResolvedValue({ game: saved, error: null });
    renderPage();
    expect(await screen.findByText('Ann pays Ben A$39.00')).toBeInTheDocument();
    expect(fetchOne).toHaveBeenCalledWith('g1');
  });

  it('says not found when the game does not exist', async () => {
    fetchOne.mockResolvedValue({ game: null, error: null });
    renderPage();
    expect(await screen.findByText('Game not found')).toBeInTheDocument();
  });

  it('tells a failed load apart from not found, and retries', async () => {
    fetchOne.mockResolvedValueOnce({
      game: null,
      error: "Couldn't load this game. Check your connection and try again.",
    });
    renderPage();
    expect(await screen.findByText("Couldn't load this game. Check your connection and try again.")).toBeInTheDocument();
    expect(screen.queryByText('Game not found')).not.toBeInTheDocument();

    fetchOne.mockResolvedValueOnce({ game: saved, error: null });
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Ann pays Ben A$39.00')).toBeInTheDocument();
    expect(fetchOne).toHaveBeenCalledTimes(2);
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import type { OneOffGame } from '@/lib/oneOff/types';

const discard = vi.fn();
const dispatch = vi.fn(() => ({ error: null }));
const save = vi.fn();
let game: OneOffGame | null = null;

vi.mock('@/contexts/OneOffGameContext', () => ({
  useOneOffGame: () => ({
    game,
    storageOk: true,
    seatedCount: 0,
    totalBuyIn: 0,
    totalPot: 0,
    start: vi.fn(),
    dispatch,
    discard,
  }),
}));

vi.mock('@/hooks/useOneOffHistory', () => ({
  useOneOffHistory: () => ({
    games: [],
    loading: false,
    refetch: vi.fn(),
    get: vi.fn(),
    save,
    remove: vi.fn(),
  }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuthContext: () => ({ user: { id: 'user-1' }, homegame: { currency: 'A$' } }),
}));

import { OneOffSettlePage } from './OneOffSettlePage';

function makeGame(annCashOut: number | null): OneOffGame {
  return {
    version: 1,
    mode: 'live',
    label: "Dan's place",
    played_on: '2026-11-26',
    currency: 'A$',
    notes: '',
    default_buy_in: 50,
    started_at: '2026-11-26T08:00:00.000Z',
    players: [
      { id: 'ann', name: 'Ann', buy_in: 50, cash_out: annCashOut },
      { id: 'ben', name: 'Ben', buy_in: 50, cash_out: 90 },
    ],
    payments: [],
  };
}

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/one-off/settle']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/one-off/settle" element={<OneOffSettlePage />} />
        <Route path="/one-off/saved/:id" element={<p>Saved page</p>} />
        <Route path="/one-off" element={<p>Hub page</p>} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  discard.mockReset();
  dispatch.mockClear();
  save.mockReset();
});

describe('OneOffSettlePage', () => {
  it('shows how far off an unbalanced game is, no transfers, and Save disabled', () => {
    // Buy-ins 100, cash-outs 5 + 90 = 95: five short.
    game = makeGame(5);
    renderPage();
    expect(screen.getByText('Cash-outs are A$5.00 short')).toBeInTheDocument();
    expect(screen.queryByText(/\w+ pays \w+ A\$/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save to my history/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /share/i })).toBeDisabled();
  });

  it('keeps Save disabled while someone has no cash-out', () => {
    game = makeGame(null);
    renderPage();
    expect(screen.getByLabelText('Cash-out for Ann')).toHaveValue(null);
    expect(screen.getByRole('button', { name: /save to my history/i })).toBeDisabled();
  });

  it('shows transfers when balanced, saves, discards and opens the saved game', async () => {
    game = makeGame(10);
    save.mockResolvedValue({ id: 'saved-42', error: null });
    renderPage();
    expect(screen.getByText('Ann pays Ben A$40.00')).toBeInTheDocument();
    const saveButton = screen.getByRole('button', { name: /save to my history/i });
    expect(saveButton).toBeEnabled();
    fireEvent.click(saveButton);
    await waitFor(() => expect(screen.getByText('Saved page')).toBeInTheDocument());
    expect(save).toHaveBeenCalledWith(game, 'user-1');
    expect(discard).toHaveBeenCalled();
  });

  it('shows the save error and keeps the game when save refuses', async () => {
    game = makeGame(10);
    save.mockResolvedValue({ id: null, error: "Couldn't save. Check your connection and try again." });
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /save to my history/i }));
    expect(await screen.findByText("Couldn't save. Check your connection and try again.")).toBeInTheDocument();
    expect(discard).not.toHaveBeenCalled();
  });

  it('Done asks first, then discards and goes back to the hub', async () => {
    game = makeGame(10);
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveTextContent('Close without saving?This game will be gone.');
    expect(discard).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Close without saving' }));
    expect(discard).toHaveBeenCalled();
    await waitFor(() => expect(screen.getByText('Hub page')).toBeInTheDocument());
  });
});

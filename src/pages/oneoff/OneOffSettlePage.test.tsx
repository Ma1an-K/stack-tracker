import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import type { OneOffGame } from '@/lib/oneOff/types';

const discard = vi.fn();
const dispatch = vi.fn(() => ({ error: null }));
const save = vi.fn();
const firstSuccess = vi.fn();
let savedGames: { id: string }[] = [];
let game: OneOffGame | null = null;
let storageOk = true;

vi.mock('@/contexts/OneOffGameContext', () => ({
  useOneOffGame: () => ({
    game,
    storageOk,
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
    games: savedGames,
    loading: false,
    refetch: vi.fn(),
    get: vi.fn(),
    save,
    remove: vi.fn(),
  }),
}));

vi.mock('@/contexts/InstallNudgeContext', () => ({
  useInstallNudge: () => ({ firstSuccess, bannerVisible: false, dismissBanner: vi.fn() }),
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
  firstSuccess.mockReset();
  savedGames = [];
  storageOk = true;
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
    expect(firstSuccess).toHaveBeenCalledWith('oneoff', true);
  });

  it('a save is not the first when the user already has saved games', async () => {
    savedGames = [{ id: 'old' }];
    game = makeGame(10);
    save.mockResolvedValue({ id: 'saved-43', error: null });
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /save to my history/i }));
    await waitFor(() => expect(screen.getByText('Saved page')).toBeInTheDocument());
    expect(firstSuccess).toHaveBeenCalledWith('oneoff', false);
  });

  it('shows the save error and keeps the game when save refuses', async () => {
    game = makeGame(10);
    save.mockResolvedValue({ id: null, error: "Couldn't save. Check your connection and try again." });
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /save to my history/i }));
    expect(await screen.findByText("Couldn't save. Check your connection and try again.")).toBeInTheDocument();
    expect(discard).not.toHaveBeenCalled();
    expect(firstSuccess).not.toHaveBeenCalled();
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

  it('while a cash-out is missing shows only the to-enter line, not "Nobody owes anything."', () => {
    // Ann not entered (counts as 0), Ben took everything: balanced at 100, but incomplete.
    game = makeGame(null);
    game.players[1].cash_out = 100;
    game.players[0].buy_in = 0;
    game.players[1].buy_in = 100;
    renderPage();
    expect(screen.getByText('Still to enter a cash-out: Ann')).toBeInTheDocument();
    expect(screen.queryByText('Nobody owes anything.')).not.toBeInTheDocument();
    expect(screen.queryByText(/\w+ pays \w+ A\$/)).not.toBeInTheDocument();
  });

  it('while a cash-out is missing does not show a short/over gap either', () => {
    game = makeGame(null);
    renderPage();
    expect(screen.getByText('Still to enter a cash-out: Ann')).toBeInTheDocument();
    expect(screen.queryByText(/Cash-outs are/)).not.toBeInTheDocument();
  });

  it('lets a one-character currency be replaced, committing on blur', () => {
    game = makeGame(10);
    game.currency = '$';
    renderPage();
    const field = screen.getByLabelText('Currency');
    fireEvent.focus(field);
    fireEvent.change(field, { target: { value: '' } });
    expect(field).toHaveValue('');
    fireEvent.change(field, { target: { value: '€' } });
    expect(dispatch).not.toHaveBeenCalled();
    fireEvent.blur(field);
    expect(dispatch).toHaveBeenCalledWith({ type: 'setMeta', patch: { currency: '€' } });
  });

  it('keeps the previous currency when the field is left blank', () => {
    game = makeGame(10);
    renderPage();
    const field = screen.getByLabelText('Currency');
    fireEvent.focus(field);
    fireEvent.change(field, { target: { value: '' } });
    fireEvent.blur(field);
    expect(dispatch).not.toHaveBeenCalled();
    expect(field).toHaveValue('A$');
  });

  it("warns that the game won't survive a refresh when this device can't store it", () => {
    game = makeGame(10);
    storageOk = false;
    renderPage();
    expect(screen.getByText('This game is only kept until you close or refresh this page.')).toBeInTheDocument();
  });

  it('shows no storage warning when the device copy is fine', () => {
    game = makeGame(10);
    renderPage();
    expect(screen.queryByText(/only kept until you close or refresh/)).not.toBeInTheDocument();
  });

  it('locks editing while a save is in flight, and unlocks if it fails', async () => {
    game = makeGame(10);
    let finish: (v: { id: string | null; error: string | null }) => void = () => {};
    save.mockReturnValue(new Promise(resolve => { finish = resolve; }));
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /save to my history/i }));
    await waitFor(() => expect(screen.getByLabelText('Label')).toBeDisabled());
    expect(screen.getByLabelText('Currency')).toBeDisabled();
    expect(screen.getByLabelText('Date')).toBeDisabled();
    expect(screen.getByLabelText('Notes')).toBeDisabled();
    expect(screen.getByLabelText('Cash-out for Ann')).toBeDisabled();
    expect(screen.getByLabelText('Buy-in for Ann')).toBeDisabled();
    expect(screen.getByLabelText('Name for Ann')).toBeDisabled();
    expect(screen.getByLabelText('New player')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Remove Ann' })).toBeDisabled();
    expect(screen.getByRole('button', { name: /record payment/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Done' })).toBeDisabled();

    await act(async () => {
      finish({ id: null, error: "Couldn't save. Check your connection and try again." });
    });
    expect(screen.getByLabelText('Label')).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Done' })).toBeEnabled();
  });

  it('disables removing a recorded payment while a save is in flight', async () => {
    game = makeGame(10);
    game.payments = [{ from_id: 'ann', to_id: 'ben', amount: 5 }];
    save.mockReturnValue(new Promise(() => {}));
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /save to my history/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Remove payment' })).toBeDisabled());
  });
});

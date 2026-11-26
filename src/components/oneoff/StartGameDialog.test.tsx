import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { localDate } from '@/lib/oneOff/localStore';

const start = vi.fn((): { error: string | null } => ({ error: null }));
const dispatch = vi.fn((): { error: string | null } => ({ error: null }));

vi.mock('@/contexts/OneOffGameContext', () => ({
  useOneOffGame: () => ({ game: null, storageOk: true, start, dispatch, discard: vi.fn() }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuthContext: () => ({ user: { id: 'user-1' }, homegame: { currency: 'A$' } }),
}));

import { StartGameDialog } from './StartGameDialog';

function renderDialog(mode: 'live' | 'totals') {
  render(
    <MemoryRouter initialEntries={['/one-off']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/one-off" element={<StartGameDialog mode={mode} onOpenChange={vi.fn()} />} />
        <Route path="/one-off/live" element={<p>Live page</p>} />
        <Route path="/one-off/settle" element={<p>Settle page</p>} />
      </Routes>
    </MemoryRouter>
  );
}

const type = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

beforeEach(() => {
  start.mockClear();
  dispatch.mockClear();
});

describe('StartGameDialog', () => {
  it('needs at least two names', () => {
    renderDialog('totals');
    type('Player 1', 'Ann');
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Add at least two players');
    expect(start).not.toHaveBeenCalled();
  });

  it('live mode refuses a default buy-in of 0', () => {
    renderDialog('live');
    type('Player 1', 'Ann');
    type('Player 2', 'Ben');
    type('Default buy-in', '0');
    fireEvent.click(screen.getByRole('button', { name: 'Start game' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a default buy-in above 0');
    expect(start).not.toHaveBeenCalled();
  });

  it('applies a date other than today with setMeta after starting', () => {
    renderDialog('totals');
    type('Player 1', 'Ann');
    type('Player 2', 'Ben');
    const other = localDate() === '2026-01-15' ? '2026-01-16' : '2026-01-15';
    type('Date', other);
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(start).toHaveBeenCalledWith({
      mode: 'totals',
      names: ['Ann', 'Ben'],
      defaultBuyIn: 0,
      label: '',
      currency: 'A$',
    });
    expect(dispatch).toHaveBeenCalledWith({ type: 'setMeta', patch: { played_on: other } });
    expect(start.mock.invocationCallOrder[0]).toBeLessThan(dispatch.mock.invocationCallOrder[0]);
    expect(screen.getByText('Settle page')).toBeInTheDocument();
  });

  it("does not dispatch a date when it is today's", () => {
    renderDialog('live');
    type('Player 1', 'Ann');
    type('Player 2', 'Ben');
    fireEvent.click(screen.getByRole('button', { name: 'Start game' }));
    expect(start).toHaveBeenCalledWith(expect.objectContaining({ mode: 'live', defaultBuyIn: 50 }));
    expect(dispatch).not.toHaveBeenCalled();
    expect(screen.getByText('Live page')).toBeInTheDocument();
  });
});

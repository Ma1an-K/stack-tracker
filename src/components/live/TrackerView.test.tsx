import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { TrackerView } from './TrackerView';
import type { LiveGameController } from './LiveGameController';

const ok = () => vi.fn().mockResolvedValue({ error: null });

function fakeController(over: Partial<LiveGameController> = {}): LiveGameController {
  return {
    players: [
      { player_id: 'p-sam', buy_in: 20 },
      { player_id: 'p-dana', buy_in: 40 },
    ],
    payments: [],
    defaultBuyIn: 20,
    startedAt: new Date().toISOString(),
    totalPot: 60,
    totalBuyIn: 60,
    seatedCount: 2,
    roster: [
      { id: 'p-sam', name: 'Sam', is_active: true },
      { id: 'p-dana', name: 'Dana', is_active: true },
    ],
    currency: '€',
    ownerName: 'Matan',
    canCreatePlayer: false,
    createPlayer: vi.fn().mockResolvedValue({ error: null, player: null }),
    addBuyIn: ok(),
    setBuyIn: ok(),
    addPlayer: ok(),
    removePlayer: ok(),
    cashOut: ok(),
    rejoin: ok(),
    addPayment: ok(),
    removePayment: ok(),
    endHref: '/finish-here',
    ...over,
  };
}

function renderTracker(controller: LiveGameController) {
  render(
    <MemoryRouter initialEntries={['/live']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/live" element={<TrackerView controller={controller} />} />
        <Route path="/finish-here" element={<p>Landed on end page</p>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('TrackerView', () => {
  it('tapping the +20 chip adds 20 through the controller', () => {
    const controller = fakeController();
    renderTracker(controller);
    fireEvent.click(screen.getByRole('button', { name: 'Add 20 to Sam' }));
    expect(controller.addBuyIn).toHaveBeenCalledWith('p-sam', 20);
  });

  it('End navigates to the controller end href', () => {
    renderTracker(fakeController());
    fireEvent.click(screen.getByRole('button', { name: /end session & cash out/i }));
    expect(screen.getByText('Landed on end page')).toBeInTheDocument();
  });

  it('shows the pot in the controller currency', () => {
    renderTracker(fakeController({ totalPot: 123.5 }));
    // Hero "On the table" figure and the summary row's "On the table".
    expect(screen.getAllByText('€123.50')).toHaveLength(2);
  });
});

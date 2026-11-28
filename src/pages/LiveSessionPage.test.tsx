import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const setupProps: { initialSelected?: string[] }[] = [];
const activePlayers = [
  { id: 'p1', name: 'Ann' },
  { id: 'p2', name: 'Ben' },
  { id: 'p3', name: 'Cat' },
];

vi.mock('@/contexts/AuthContext', () => ({
  useAuthContext: () => ({ homegame: { id: 'hg-1', name: 'Friday' } }),
}));
vi.mock('@/contexts/LiveSessionContext', () => ({
  useLiveSession: () => ({ liveSession: null, loading: false, start: vi.fn(), finish: vi.fn() }),
}));
vi.mock('@/hooks/usePlayers', () => ({
  usePlayers: () => ({ players: activePlayers, activePlayers, loading: false }),
}));
vi.mock('@/components/live/useHomegameLiveController', () => ({ useHomegameLiveController: () => null }));
vi.mock('@/components/live/TrackerView', () => ({ TrackerView: () => null }));
vi.mock('@/components/live/SetupView', () => ({
  SetupView: (props: { initialSelected?: string[] }) => {
    setupProps.push(props);
    return null;
  },
}));

import { LiveSessionPage } from './LiveSessionPage';

const renderAt = (url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <LiveSessionPage />
    </MemoryRouter>
  );
const last = () => setupProps[setupProps.length - 1];

beforeEach(() => {
  setupProps.length = 0;
});

describe('LiveSessionPage seat=all', () => {
  it('pre-selects every active player', () => {
    renderAt('/live-session?seat=all');
    expect(last().initialSelected).toEqual(['p1', 'p2', 'p3']);
  });

  it('pre-selects nobody without the param', () => {
    renderAt('/live-session');
    expect(last().initialSelected).toBeUndefined();
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

type Seed = { player_id: string; buy_in: number; cash_out?: number }[] | undefined;
const formProps: { initialPlayers: Seed }[] = [];
let liveSession: { id: string; players: { player_id: string; buy_in: number; cash_out?: number }[]; payments: []; notes: null } | null = null;

const activePlayers = [
  { id: 'p1', name: 'Ann' },
  { id: 'p2', name: 'Ben' },
  { id: 'p3', name: 'Cat' },
];

vi.mock('@/contexts/AuthContext', () => ({
  useAuthContext: () => ({ homegame: { id: 'hg-1', name: 'Friday', currency: '$' }, isOwner: true }),
}));
vi.mock('@/contexts/LiveSessionContext', () => ({
  useLiveSession: () => ({ liveSession, finish: vi.fn() }),
}));
vi.mock('@/hooks/usePlayers', () => ({
  usePlayers: () => ({ activePlayers, loading: false, addPlayer: vi.fn() }),
}));
vi.mock('@/hooks/useSessions', () => ({
  useSessions: () => ({ createSession: vi.fn() }),
}));
vi.mock('@/components/sessions/LiveSessionCard', () => ({ LiveSessionCard: () => null }));
vi.mock('@/components/sessions/SessionForm', () => ({
  SessionForm: (props: { initialPlayers: Seed }) => {
    formProps.push(props);
    return null;
  },
}));

import { NewSessionPage } from './NewSessionPage';

const renderAt = (url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <NewSessionPage />
    </MemoryRouter>
  );
const lastSeed = () => formProps[formProps.length - 1].initialPlayers;

beforeEach(() => {
  formProps.length = 0;
  liveSession = null;
});

describe('NewSessionPage seat=all', () => {
  it('seats every active player with a zero buy-in', () => {
    renderAt('/new-session?seat=all');
    expect(lastSeed()).toEqual([
      { player_id: 'p1', buy_in: 0 },
      { player_id: 'p2', buy_in: 0 },
      { player_id: 'p3', buy_in: 0 },
    ]);
  });

  it('seeds nobody without the param', () => {
    renderAt('/new-session');
    expect(lastSeed()).toBeUndefined();
  });

  it('lets from=live win when a live session exists', () => {
    liveSession = { id: 'ls-1', players: [{ player_id: 'p2', buy_in: 50 }], payments: [], notes: null };
    renderAt('/new-session?from=live&seat=all');
    expect(lastSeed()).toEqual([{ player_id: 'p2', buy_in: 50 }]);
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

type Seed = { player_id: string; buy_in: number; cash_out?: number }[] | undefined;
type Submit = (date: string, players: [], notes: undefined, payments: []) => Promise<{ error: unknown }>;
const formProps: { initialPlayers: Seed; onSubmit: Submit }[] = [];
const firstSuccess = vi.fn();
const countSessionsIn = vi.fn();
let sessions: { id: string }[] = [];
let homegames = [{ id: 'hg-1' }];
let liveSession: { id: string; players: { player_id: string; buy_in: number; cash_out?: number }[]; payments: []; notes: null } | null = null;

const activePlayers = [
  { id: 'p1', name: 'Ann' },
  { id: 'p2', name: 'Ben' },
  { id: 'p3', name: 'Cat' },
];

vi.mock('@/contexts/AuthContext', () => ({
  useAuthContext: () => ({ homegame: { id: 'hg-1', name: 'Friday', currency: '$' }, homegames, isOwner: true }),
}));
vi.mock('@/contexts/LiveSessionContext', () => ({
  useLiveSession: () => ({ liveSession, finish: vi.fn() }),
}));
vi.mock('@/hooks/usePlayers', () => ({
  usePlayers: () => ({ activePlayers, loading: false, addPlayer: vi.fn() }),
}));
vi.mock('@/hooks/useSessions', () => ({
  useSessions: () => ({
    sessions,
    loading: false,
    createSession: vi.fn().mockResolvedValue({ error: null, session: { id: 's-new' } }),
  }),
  countSessionsIn: (ids: string[]) => countSessionsIn(ids),
}));
vi.mock('@/contexts/InstallNudgeContext', () => ({
  useInstallNudge: () => ({ firstSuccess, bannerVisible: false, dismissBanner: vi.fn() }),
}));
vi.mock('@/components/sessions/LiveSessionCard', () => ({ LiveSessionCard: () => null }));
vi.mock('@/components/sessions/SessionForm', () => ({
  SessionForm: (props: { initialPlayers: Seed; onSubmit: Submit }) => {
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
  sessions = [];
  homegames = [{ id: 'hg-1' }];
  firstSuccess.mockReset();
  countSessionsIn.mockReset().mockResolvedValue(0);
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

describe('NewSessionPage second install ask', () => {
  const save = () => formProps[formProps.length - 1].onSubmit('2026-11-28', [], undefined, []);

  it("counts the account's first when this is its only homegame and it had no sessions", async () => {
    renderAt('/new-session');
    await save();
    await waitFor(() => expect(firstSuccess).toHaveBeenCalledWith('session', true));
    expect(countSessionsIn).not.toHaveBeenCalled();
  });

  it('is not the first when this homegame already had sessions', async () => {
    sessions = [{ id: 's-old' }];
    renderAt('/new-session');
    await save();
    expect(firstSuccess).not.toHaveBeenCalled();
  });

  it("checks the user's other homegames for sessions", async () => {
    homegames = [{ id: 'hg-1' }, { id: 'hg-2' }];
    countSessionsIn.mockResolvedValue(3);
    renderAt('/new-session');
    await save();
    await waitFor(() => expect(firstSuccess).toHaveBeenCalledWith('session', false));
    expect(countSessionsIn).toHaveBeenCalledWith(['hg-2']);
  });
});

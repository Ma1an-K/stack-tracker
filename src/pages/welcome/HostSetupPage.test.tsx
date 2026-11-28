import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';

const createHomegame = vi.fn();
const selectHomegame = vi.fn();
const updateHomegame = vi.fn();
const addPlayer = vi.fn();
const createInviteCode = vi.fn();

type Hg = { id: string; name: string; role: string };
let homegames: Hg[] = [];
let players: { id: string; name: string; user_id: string | null }[] = [];

vi.mock('@/contexts/AuthContext', () => ({
  useAuthContext: () => ({
    user: { id: 'user-1' },
    loading: false,
    profile: { id: 'user-1', display_name: 'Sam', username: 'sam' },
    homegame: homegames[0] ?? null,
    homegames,
    createHomegame,
    selectHomegame,
    updateHomegame,
  }),
}));

// Like the real hook: players added through addPlayer show up in `players`.
vi.mock('@/hooks/usePlayers', () => ({
  usePlayers: (id: string | undefined) => ({ players: id ? players : [], activePlayers: [], loading: false, addPlayer }),
}));

vi.mock('@/hooks/useInviteCodes', () => ({
  useInviteCodes: () => ({ inviteCodes: [], activeInviteCodes: [], loading: false, createInviteCode }),
}));

import { HostSetupPage } from './HostSetupPage';

function memoryStorage(map: Map<string, string>) {
  return {
    getItem: vi.fn((k: string) => map.get(k) ?? null),
    setItem: vi.fn((k: string, v: string) => void map.set(k, v)),
    removeItem: vi.fn((k: string) => void map.delete(k)),
  };
}

let store: Map<string, string>;
let session: Map<string, string>;
beforeEach(() => {
  store = new Map();
  session = new Map();
  vi.stubGlobal('localStorage', memoryStorage(store));
  vi.stubGlobal('sessionStorage', memoryStorage(session));
  homegames = [];
  players = [];
  selectHomegame.mockReset();
  createHomegame.mockReset().mockImplementation(async (name: string) => {
    homegames = [{ id: 'hg-1', name, role: 'owner' }];
    return { error: null, homegame: { id: 'hg-1', name } };
  });
  addPlayer.mockReset().mockImplementation(async (name: string, opts?: { linkUserId?: string }) => {
    const player = { id: `p-${name}`, name, user_id: opts?.linkUserId ?? null };
    players = [...players, player];
    return { error: null, player };
  });
  createInviteCode.mockReset().mockResolvedValue({ error: null, code: { id: 'c1', code: 'K7Q44MXP' } });
});
afterEach(() => vi.unstubAllGlobals());

function Where() {
  const { pathname, search } = useLocation();
  return <p data-testid="where">{pathname + search}</p>;
}

function renderHost() {
  render(
    <MemoryRouter initialEntries={['/welcome/host']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/welcome/host" element={<HostSetupPage />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>
  );
}

async function toCrewStep() {
  renderHost();
  fireEvent.change(screen.getByLabelText('Game name'), { target: { value: 'Friday Night Game' } });
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  await screen.findByRole('heading', { name: 'Who plays?' });
}

function addName(name: string) {
  fireEvent.change(screen.getByLabelText('Add a name'), { target: { value: name } });
  fireEvent.click(screen.getByRole('button', { name: 'Add player' }));
}

const continueButton = () => screen.getByRole('button', { name: 'Continue' });

describe('HostSetupPage', () => {
  it('step 1 creates the homegame, then the crew starts with you', async () => {
    await toCrewStep();
    expect(createHomegame).toHaveBeenCalledWith('Friday Night Game');
    expect(screen.getByLabelText('Player 1')).toHaveValue('Sam');
    expect(screen.getByText('You')).toBeInTheDocument();
  });

  it('shows the homegame limit error inline and stays on step 1', async () => {
    createHomegame.mockResolvedValue({ error: new Error('You have reached the maximum limit of 5 homegames.') });
    renderHost();
    fireEvent.change(screen.getByLabelText('Game name'), { target: { value: 'One Too Many' } });
    fireEvent.click(continueButton());
    expect(await screen.findByText('You have reached the maximum limit of 5 homegames.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Name your game' })).toBeInTheDocument();
  });

  it('Continue on the crew step needs at least 2 distinct, non-empty names', async () => {
    await toCrewStep();

    // ['Sam']
    expect(continueButton()).toBeDisabled();
    expect(screen.getByText('Add at least 2 players')).toBeInTheDocument();

    // ['Sam', 'Dan'] → enabled
    addName('Dan');
    expect(screen.getByLabelText('Player 2')).toHaveValue('Dan');
    expect(continueButton()).toBeEnabled();
    expect(screen.getByText('2 players · ready for a first game')).toBeInTheDocument();

    // ['Sam', '']
    fireEvent.change(screen.getByLabelText('Player 2'), { target: { value: '' } });
    expect(continueButton()).toBeDisabled();
    expect(screen.getByText('Every player needs a name')).toBeInTheDocument();

    // ['Sam', 'sam']
    fireEvent.change(screen.getByLabelText('Player 2'), { target: { value: 'sam' } });
    expect(continueButton()).toBeDisabled();
    expect(screen.getByText('Two players are called sam')).toBeInTheDocument();
  });

  it('saves the crew with you linked to your account', async () => {
    await toCrewStep();
    addName('Dan');
    fireEvent.click(continueButton());
    await screen.findByRole('heading', { name: 'Bring them in' });
    expect(addPlayer).toHaveBeenCalledWith('Sam', expect.objectContaining({ linkUserId: 'user-1' }));
    expect(addPlayer).toHaveBeenCalledWith('Dan', expect.not.objectContaining({ linkUserId: expect.anything() }));
  });

  it('removing "You" adds nobody linked to your account', async () => {
    await toCrewStep();
    addName('Dan');
    addName('Maya');
    fireEvent.click(screen.getByRole('button', { name: 'Remove Sam' }));
    fireEvent.click(continueButton());
    await screen.findByRole('heading', { name: 'Bring them in' });
    expect(addPlayer).toHaveBeenCalledTimes(2);
    for (const call of addPlayer.mock.calls) expect(call[1]?.linkUserId).toBeUndefined();
  });

  async function toInviteStep() {
    await toCrewStep();
    addName('Dan');
    addName('Maya');
    fireEvent.click(continueButton());
    await screen.findByRole('heading', { name: 'Bring them in' });
  }

  it('step 3 creates an invite code when there is none, and copying the link marks it shared', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText }, share: undefined });
    await toInviteStep();
    expect(await screen.findByText('K7Q44MXP')).toBeInTheDocument();
    expect(createInviteCode).toHaveBeenCalledTimes(1);
    // Setup shows the code itself, so the hook's "Invite code created" toast is suppressed.
    expect(createInviteCode).toHaveBeenCalledWith(expect.objectContaining({ quiet: true }));
    fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));
    await waitFor(() => expect(store.get('invite_shared:hg-1')).toBe('1'));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('/auth?mode=signup&code=K7Q44MXP'));
  });

  async function toFirstGameStep() {
    await toInviteStep();
    await screen.findByText('K7Q44MXP');
    fireEvent.click(screen.getByRole('button', { name: 'Skip for now' }));
    await screen.findByRole('heading', { name: 'Log your first game' });
  }

  it('step 4 names the seated crew', async () => {
    await toFirstGameStep();
    expect(screen.getByText(/Sam, Dan and Maya are seated/)).toBeInTheDocument();
  });

  it('"Enter final totals" opens the totals form with everyone seated', async () => {
    await toFirstGameStep();
    fireEvent.click(screen.getByRole('button', { name: /Enter final totals/ }));
    expect(screen.getByTestId('where')).toHaveTextContent('/new-session?seat=all');
  });

  it('"Play live" opens a live game with everyone seated', async () => {
    await toFirstGameStep();
    fireEvent.click(screen.getByRole('button', { name: /Play live/ }));
    expect(screen.getByTestId('where')).toHaveTextContent('/live-session?seat=all');
  });

  it('"I\'ll do this later" goes Home', async () => {
    await toFirstGameStep();
    fireEvent.click(screen.getByRole('button', { name: "I'll do this later" }));
    expect(screen.getByTestId('where')).toHaveTextContent(/^\/$/);
  });

  it('after the crew is saved, going back shows it read-only and only adds new names', async () => {
    await toInviteStep();
    expect(addPlayer).toHaveBeenCalledTimes(3);
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    await screen.findByRole('heading', { name: 'Who plays?' });

    // The only text box left is the one for new names.
    expect(screen.getAllByRole('textbox')).toEqual([screen.getByLabelText('Add a name')]);
    for (const name of ['Sam', 'Dan', 'Maya']) expect(screen.getByText(name)).toBeInTheDocument();
    expect(screen.getByText('Edit names later in Players')).toBeInTheDocument();

    addName('Ana');
    fireEvent.click(continueButton());
    await screen.findByRole('heading', { name: 'Bring them in' });
    expect(addPlayer).toHaveBeenCalledTimes(4);
    expect(addPlayer).toHaveBeenLastCalledWith('Ana', expect.anything());
  });

  it('remembers progress in sessionStorage and clears it when the flow ends', async () => {
    await toInviteStep();
    expect(JSON.parse(session.get('host_setup') ?? '{}')).toEqual({ homegameId: 'hg-1', step: 3 });
    await screen.findByText('K7Q44MXP');
    fireEvent.click(screen.getByRole('button', { name: 'Skip for now' }));
    await screen.findByRole('heading', { name: 'Log your first game' });
    fireEvent.click(screen.getByRole('button', { name: /Play live/ }));
    expect(session.has('host_setup')).toBe(false);
  });

  it('a reload resumes at the saved step without creating another homegame', async () => {
    homegames = [{ id: 'hg-1', name: 'Friday Night Game', role: 'owner' }];
    players = [
      { id: 'p1', name: 'Sam', user_id: 'user-1' },
      { id: 'p2', name: 'Dan', user_id: null },
    ];
    session.set('host_setup', JSON.stringify({ homegameId: 'hg-1', step: 3 }));
    renderHost();
    expect(await screen.findByRole('heading', { name: 'Bring them in' })).toBeInTheDocument();
    expect(selectHomegame).toHaveBeenCalledWith('hg-1');
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(await screen.findByRole('heading', { name: 'Who plays?' })).toBeInTheDocument();
    // Back from the crew step never returns to naming (that would create a game).
    expect(screen.getAllByRole('textbox')).toEqual([screen.getByLabelText('Add a name')]);
    expect(createHomegame).not.toHaveBeenCalled();
  });

  it('a saved step 1 resumes at the crew step', async () => {
    homegames = [{ id: 'hg-1', name: 'Friday Night Game', role: 'owner' }];
    session.set('host_setup', JSON.stringify({ homegameId: 'hg-1', step: 1 }));
    renderHost();
    expect(await screen.findByRole('heading', { name: 'Who plays?' })).toBeInTheDocument();
    expect(screen.getByLabelText('Player 1')).toHaveValue('Sam');
    expect(createHomegame).not.toHaveBeenCalled();
  });

  it('ignores a saved flow for a homegame the user no longer owns', async () => {
    homegames = [{ id: 'hg-other', name: 'Other', role: 'member' }];
    session.set('host_setup', JSON.stringify({ homegameId: 'hg-gone', step: 3 }));
    renderHost();
    expect(screen.getByRole('heading', { name: 'Name your game' })).toBeInTheDocument();
    expect(session.has('host_setup')).toBe(false);
  });
});

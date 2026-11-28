import { createContext, useContext, useState, type ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';

// The join flow end to end: JoinPage joins, then WhoAreYouPage must show the
// joined homegame. Auth is a real piece of React state here, updated the way
// useAuth does it: joinHomegame refreshes user data (making the joined game
// current) before it resolves, and JoinPage navigates right after.

type Hg = { id: string; name: string; role: string };
type Auth = { user: { id: string }; loading: boolean; homegame: Hg | null; homegames: Hg[]; joinHomegame: (code: string) => Promise<{ error: null; homegameId: string }> };

const AuthCtx = createContext<Auth | null>(null);
vi.mock('@/contexts/AuthContext', () => ({ useAuthContext: () => useContext(AuthCtx) }));

const playersByGame: Record<string, { id: string; name: string; user_id: string | null }[]> = {
  old: [{ id: 'p-old', name: 'Oldtimer', user_id: null }],
  new: [
    { id: 'p-dan', name: 'Dan', user_id: null },
    { id: 'p-sam', name: 'Sam', user_id: 'host' },
  ],
};
vi.mock('@/hooks/usePlayers', () => ({
  usePlayers: (id: string | undefined) => ({ players: id ? playersByGame[id] ?? [] : [], loading: false }),
}));

const claimHomegameIds: (string | undefined)[] = [];
vi.mock('@/hooks/usePlayerClaims', () => ({
  usePlayerClaims: (id: string | undefined) => {
    claimHomegameIds.push(id);
    return { requestClaim: vi.fn() };
  },
}));

import { JoinPage } from './JoinPage';
import { WhoAreYouPage } from './WhoAreYouPage';

const newGame: Hg = { id: 'new', name: 'Friday Night Game', role: 'member' };

function AuthHarness({ start, children }: { start: Hg[]; children: ReactNode }) {
  const [homegames, setHomegames] = useState<Hg[]>(start);
  const [homegame, setHomegame] = useState<Hg | null>(start[0] ?? null);
  const joinHomegame = async () => {
    await Promise.resolve(); // the RPC
    setHomegames((list) => [...list, newGame]);
    setHomegame(newGame); // fetchUserData picks the saved joined id
    return { error: null, homegameId: newGame.id };
  };
  return (
    <AuthCtx.Provider value={{ user: { id: 'user-2' }, loading: false, homegame, homegames, joinHomegame }}>
      {children}
    </AuthCtx.Provider>
  );
}

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>;
}

function renderFlow(start: Hg[]) {
  render(
    <AuthHarness start={start}>
      <MemoryRouter initialEntries={['/welcome/join?code=ABCD1234']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/welcome/join" element={<JoinPage />} />
          <Route path="/welcome/who" element={<WhoAreYouPage />} />
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>
    </AuthHarness>
  );
}

beforeEach(() => {
  claimHomegameIds.length = 0;
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
});
afterEach(() => vi.unstubAllGlobals());

describe('join flow', () => {
  it('a new user lands on the joined game\'s players, not bounced home', async () => {
    renderFlow([]);
    fireEvent.click(screen.getByRole('button', { name: 'Join homegame' }));
    expect(await screen.findByRole('heading', { name: 'Which one is you?' })).toBeInTheDocument();
    expect(screen.getByText('Friday Night Game')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dan' })).toBeInTheDocument();
    expect(screen.queryByTestId('where')).not.toBeInTheDocument();
  });

  it('a user already in another game sees the new game\'s players and claims there', async () => {
    renderFlow([{ id: 'old', name: 'Old Game', role: 'owner' }]);
    fireEvent.click(screen.getByRole('button', { name: 'Join homegame' }));
    expect(await screen.findByRole('heading', { name: 'Which one is you?' })).toBeInTheDocument();
    expect(screen.getByText('Friday Night Game')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dan' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Oldtimer' })).not.toBeInTheDocument();
    expect(claimHomegameIds).not.toContain('old');
  });
});

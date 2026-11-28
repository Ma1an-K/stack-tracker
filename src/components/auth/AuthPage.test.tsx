import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

type AuthState = {
  user: { id: string } | null;
  homegames: { id: string }[];
  userDataPending?: boolean;
  membershipsError?: boolean;
};
let auth: AuthState = { user: null, homegames: [] };

vi.mock('@/contexts/AuthContext', () => ({
  useAuthContext: () => ({
    ...auth,
    loading: false,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    resetPasswordForEmail: vi.fn(),
  }),
}));

vi.mock('@/lib/inviteLink', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/inviteLink')>();
  return { ...actual, savePendingCode: vi.fn(actual.savePendingCode) };
});

import { savePendingCode } from '@/lib/inviteLink';
import { AuthPage } from './AuthPage';

// Node's own (unconfigured) localStorage shadows jsdom's, so each test gets
// a fresh in-memory store, as in src/hooks/useAuth.test.ts.
let store: Map<string, string>;
function stubStorage() {
  store = new Map();
  vi.stubGlobal('localStorage', {
    getItem: vi.fn((k: string) => store.get(k) ?? null),
    setItem: vi.fn((k: string, v: string) => void store.set(k, v)),
    removeItem: vi.fn((k: string) => void store.delete(k)),
  });
}
afterEach(() => vi.unstubAllGlobals());

function tree(initial: string) {
  return (
    <MemoryRouter initialEntries={[initial]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/welcome" element={<p>choice screen</p>} />
        <Route path="/welcome/join" element={<p>join step</p>} />
        <Route path="/" element={<p>home</p>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('AuthPage after sign-in', () => {
  beforeEach(() => {
    stubStorage();
    vi.mocked(savePendingCode).mockClear();
    auth = { user: null, homegames: [] };
  });

  // Invite codes are 8 characters; people paste them with hyphens.
  it('keeps an invite code from the link before sign-in, then sends a new player to the join step', () => {
    const { rerender } = render(tree('/auth?code=K7Q4-MX2P'));
    expect(savePendingCode).toHaveBeenCalledWith('K7Q4MX2P');
    expect(screen.queryByText('join step')).toBeNull();

    auth = { user: { id: 'user-1' }, homegames: [] };
    rerender(tree('/auth?code=K7Q4-MX2P'));
    expect(screen.getByText('join step')).toBeInTheDocument();
  });

  it('sends a new account with no invite to the choice screen', () => {
    auth = { user: { id: 'user-1' }, homegames: [] };
    render(tree('/auth'));
    expect(screen.getByText('choice screen')).toBeInTheDocument();
  });

  it('sends a member of a homegame home', () => {
    auth = { user: { id: 'user-1' }, homegames: [{ id: 'hg-1' }] };
    render(tree('/auth'));
    expect(screen.getByText('home')).toBeInTheDocument();
  });

  it('stays on the signup form while signup briefly signs the new account in', () => {
    const { rerender } = render(tree('/auth?mode=signup'));
    auth = { user: { id: 'user-1' }, homegames: [] };
    rerender(tree('/auth?mode=signup'));
    expect(screen.queryByText('choice screen')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Join the table.' })).toBeInTheDocument();
  });

  // Existing members sign in with no welcome_seen on this device: the user lands
  // before their homegames do, and that gap must never route to the choice screen.
  it('waits for the signed-in user\'s homegames, then sends a member home', () => {
    const { rerender } = render(tree('/auth'));
    auth = { user: { id: 'user-1' }, homegames: [], userDataPending: true };
    rerender(tree('/auth'));
    expect(screen.queryByText('choice screen')).toBeNull();
    expect(screen.queryByText('home')).toBeNull();

    auth = { user: { id: 'user-1' }, homegames: [{ id: 'hg-1' }], userDataPending: false };
    rerender(tree('/auth'));
    expect(screen.getByText('home')).toBeInTheDocument();
    expect(screen.queryByText('choice screen')).toBeNull();
  });

  it('sends someone home, not to the choice screen, when their homegames failed to load', () => {
    auth = { user: { id: 'user-1' }, homegames: [], membershipsError: true };
    render(tree('/auth'));
    expect(screen.getByText('home')).toBeInTheDocument();
    expect(screen.queryByText('choice screen')).toBeNull();
  });
});

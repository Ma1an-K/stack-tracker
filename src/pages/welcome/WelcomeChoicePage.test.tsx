import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

type AuthState = { user: { id: string } | null; loading: boolean };
let auth: AuthState = { user: { id: 'user-1' }, loading: false };

vi.mock('@/contexts/AuthContext', () => ({
  useAuthContext: () => ({
    ...auth,
    profile: auth.user ? { id: 'user-1', display_name: 'Dana', username: 'dana' } : null,
  }),
}));

import { WelcomeLayout } from './WelcomeLayout';
import { WelcomeChoicePage } from './WelcomeChoicePage';

// Node's own (unconfigured) localStorage shadows jsdom's, so each test gets
// a fresh in-memory store, as in src/hooks/useAuth.test.ts.
let store: Map<string, string>;
beforeEach(() => {
  auth = { user: { id: 'user-1' }, loading: false };
  store = new Map();
  vi.stubGlobal('localStorage', {
    getItem: vi.fn((k: string) => store.get(k) ?? null),
    setItem: vi.fn((k: string, v: string) => void store.set(k, v)),
    removeItem: vi.fn((k: string) => void store.delete(k)),
  });
});
afterEach(() => vi.unstubAllGlobals());

function renderWelcome() {
  render(
    <MemoryRouter initialEntries={['/welcome']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/welcome" element={<WelcomeLayout />}>
          <Route index element={<WelcomeChoicePage />} />
        </Route>
        <Route path="/welcome/host" element={<p>host step</p>} />
        <Route path="/welcome/join" element={<p>join step</p>} />
        <Route path="/one-off" element={<p>one-off hub</p>} />
        <Route path="/auth" element={<p>sign in</p>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('WelcomeChoicePage', () => {
  it('greets the user by name and offers the three ways in', () => {
    renderWelcome();
    expect(screen.getByText('Welcome, Dana')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'What brings you here?' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /I run a regular game/ })).toHaveAttribute('href', '/welcome/host');
    expect(screen.getByRole('link', { name: /I've got an invite/ })).toHaveAttribute('href', '/welcome/join');
    expect(screen.getByRole('button', { name: /Just settle tonight/ })).toBeInTheDocument();
    expect(screen.getByText('You can do the others any time.')).toBeInTheDocument();
  });

  it('"Just settle tonight" remembers the choice and opens the one-off hub', () => {
    renderWelcome();
    fireEvent.click(screen.getByRole('button', { name: /Just settle tonight/ }));
    expect(store.get('welcome_seen')).toBe('1');
    expect(screen.getByText('one-off hub')).toBeInTheDocument();
  });

  it('picking a homegame path also remembers the choice', () => {
    renderWelcome();
    fireEvent.click(screen.getByRole('link', { name: /I run a regular game/ }));
    expect(store.get('welcome_seen')).toBe('1');
    expect(screen.getByText('host step')).toBeInTheDocument();
  });

  it('sends signed-out visitors to sign in', () => {
    auth = { user: null, loading: false };
    renderWelcome();
    expect(screen.getByText('sign in')).toBeInTheDocument();
  });
});

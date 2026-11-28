import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';

// The shell sends a signed-in user with no homegame to the first-run welcome,
// whatever route they arrive by (email-confirmation link to "/", reopening the app).
let auth: { homegames: { id: string }[] } = { homegames: [] };

// Modules read localStorage on import (before beforeEach), so stub it from the start.
const storage = vi.hoisted(() => {
  const s = { store: new Map<string, string>() };
  globalThis.localStorage = {
    getItem: (k: string) => s.store.get(k) ?? null,
    setItem: (k: string, v: string) => void s.store.set(k, v),
    removeItem: (k: string) => void s.store.delete(k),
  } as Storage;
  return s;
});

vi.mock('@/contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useAuthContext: () => ({
    user: { id: 'user-1' },
    profile: { id: 'user-1', display_name: 'Dana', username: 'dana' },
    homegames: auth.homegames,
    homegame: auth.homegames[0] ?? null,
    loading: false,
    isRecovery: false,
    updatePassword: vi.fn(),
  }),
}));

vi.mock('@/components/layout/MainLayout', () => ({
  MainLayout: () => <p>app shell</p>,
}));

vi.mock('@/pages/welcome/WelcomeChoicePage', () => ({
  WelcomeChoicePage: () => <p>choice screen</p>,
}));

import App from './App';

beforeEach(() => {
  auth = { homegames: [] };
  storage.store.clear();
  window.history.replaceState(null, '', '/');
  // The real App's BrowserRouter logs v7 future-flag notices; not what this file tests.
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe('app shell first-run redirect', () => {
  it('sends a new account with no homegame from "/" to the choice screen', async () => {
    render(<App />);
    await waitFor(() => expect(window.location.pathname).toBe('/welcome'));
    expect(await screen.findByText('choice screen')).toBeInTheDocument();
    expect(screen.queryByText('app shell')).toBeNull();
  });

  it('sends someone with an invite on this device to the join step', async () => {
    storage.store.set('pendingInviteCode', JSON.stringify({ code: 'K7Q4MX2P', savedAt: Date.now() }));
    window.history.replaceState(null, '', '/sessions');
    // /welcome/join is added in Task 7; until then NotFound logs the miss.
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<App />);
    await waitFor(() => expect(window.location.pathname).toBe('/welcome/join'));
  });

  it('renders the shell once a welcome choice was made', () => {
    storage.store.set('welcome_seen', '1');
    render(<App />);
    expect(screen.getByText('app shell')).toBeInTheDocument();
    expect(window.location.pathname).toBe('/');
  });

  it('renders the shell for a homegame member', () => {
    auth = { homegames: [{ id: 'hg-1' }] };
    render(<App />);
    expect(screen.getByText('app shell')).toBeInTheDocument();
    expect(window.location.pathname).toBe('/');
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { InstallContext } from '@/lib/installContext';

// On a phone browser, a signed-out visitor is asked to install before signing up,
// because a Home Screen app on iPhone doesn't share sign-in with Safari.
let context: InstallContext = 'ios-safari';
vi.mock('@/hooks/useInstallPrompt', () => ({
  useInstallPrompt: () => ({ context, trigger: null }),
}));

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
    user: null,
    profile: null,
    homegames: [],
    homegame: null,
    loading: false,
    isRecovery: false,
    updatePassword: vi.fn(),
    signIn: vi.fn(),
    signUp: vi.fn(),
    resetPasswordForEmail: vi.fn(),
  }),
}));

vi.mock('@/pages/LandingPage', () => ({
  LandingPage: () => <p>marketing page</p>,
}));

import App from './App';

function pendingCode() {
  const raw = storage.store.get('pendingInviteCode');
  return raw ? (JSON.parse(raw) as { code: string }).code : null;
}

beforeEach(() => {
  context = 'ios-safari';
  storage.store.clear();
  sessionStorage.clear();
  window.history.replaceState(null, '', '/');
  // The real App's BrowserRouter logs v7 future-flag notices; not what this file tests.
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe('install first on a phone', () => {
  it('on iPhone, an invite link opens the phone landing with the code, before sign-up', () => {
    window.history.replaceState(null, '', '/auth?mode=signup&code=K7Q4-MX2P');
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Your poker night, one tap away.' })).toBeInTheDocument();
    expect(screen.getByText('K7Q4MX2P')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add to Home Screen' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Username')).not.toBeInTheDocument();
    // Saved before they leave, so it survives installing instead.
    expect(pendingCode()).toBe('K7Q4MX2P');
  });

  it('"Continue in browser" opens the signup form with the code still saved', () => {
    window.history.replaceState(null, '', '/auth?mode=signup&code=K7Q4-MX2P');
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Continue in browser' }));

    expect(screen.getByRole('heading', { name: 'Join the table.' })).toBeInTheDocument();
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
    expect(pendingCode()).toBe('K7Q4MX2P');
    expect(sessionStorage.getItem('continue_in_browser')).toBe('1');
  });

  it('on "/" shows the phone landing, and "Continue in browser" goes to sign-up', () => {
    render(<App />);
    expect(screen.queryByText('marketing page')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Continue in browser' }));

    expect(window.location.pathname).toBe('/auth');
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
  });

  it('"Learn more" shows the full marketing page on a phone', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('link', { name: 'Learn more' }));

    expect(window.location.search).toBe('?learn=1');
    expect(screen.getByText('marketing page')).toBeInTheDocument();
  });

  it('keeps the marketing page on a laptop', () => {
    context = 'desktop';
    render(<App />);
    expect(screen.getByText('marketing page')).toBeInTheDocument();
  });

  it('skips the phone landing once they chose the browser this visit', () => {
    sessionStorage.setItem('continue_in_browser', '1');
    window.history.replaceState(null, '', '/auth?mode=signup');
    render(<App />);
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
  });
});

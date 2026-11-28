import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { InstallContext } from '@/lib/installContext';

// The email confirmation link opens in the phone's browser, but on iPhone the
// Home Screen app doesn't share that sign-in, so we point them back to the app.
let context: InstallContext = 'ios-safari';
vi.mock('@/hooks/useInstallPrompt', () => ({
  useInstallPrompt: () => ({ context, trigger: null }),
}));

import { ConfirmedPage } from './ConfirmedPage';

function renderAt() {
  return render(
    <MemoryRouter initialEntries={['/confirmed']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/confirmed" element={<ConfirmedPage />} />
        <Route path="/" element={<p>app home</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  context = 'ios-safari';
  sessionStorage.clear();
});

describe('ConfirmedPage', () => {
  it('in a phone browser, says they are confirmed and points to the Home Screen app', () => {
    renderAt();
    expect(screen.getByRole('heading', { name: "You're confirmed" })).toBeInTheDocument();
    expect(screen.getByText('Open Stack Tracker from your Home Screen to sign in')).toBeInTheDocument();
    expect(screen.queryByText('app home')).not.toBeInTheDocument();
  });

  it('"Continue here instead" remembers the choice and opens the app in this browser', () => {
    context = 'android-manual';
    renderAt();
    fireEvent.click(screen.getByRole('button', { name: 'Continue here instead' }));

    expect(sessionStorage.getItem('continue_in_browser')).toBe('1');
    expect(screen.getByText('app home')).toBeInTheDocument();
  });

  it.each<InstallContext>(['desktop', 'installed', 'native'])('in %s, goes straight to the app', (c) => {
    context = c;
    renderAt();
    expect(screen.getByText('app home')).toBeInTheDocument();
    expect(screen.queryByText("You're confirmed")).not.toBeInTheDocument();
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';

const requestClaim = vi.fn();
const firstSuccess = vi.fn();
let myRequests: { id: string }[] = [];
const toast = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuthContext: () => ({
    user: { id: 'user-2' },
    loading: false,
    homegame: { id: 'hg-1', name: 'Friday Night Game', role: 'member' },
  }),
}));

vi.mock('@/hooks/usePlayers', () => ({
  usePlayers: (id: string | undefined) => ({
    players:
      id === 'hg-1'
        ? [
            { id: 'p-sam', name: 'Sam', user_id: 'user-1' },
            { id: 'p-dan', name: 'Dan', user_id: null },
            { id: 'p-maya', name: 'Maya', user_id: null },
          ]
        : [],
    loading: false,
  }),
}));

vi.mock('@/hooks/usePlayerClaims', () => ({
  usePlayerClaims: () => ({ requestClaim, myRequests, loading: false }),
}));

vi.mock('@/contexts/InstallNudgeContext', () => ({
  useInstallNudge: () => ({ firstSuccess, bannerVisible: false, dismissBanner: vi.fn() }),
}));

vi.mock('@/hooks/use-toast', () => ({ toast: (...args: unknown[]) => toast(...args) }));

import { WhoAreYouPage } from './WhoAreYouPage';

beforeEach(() => {
  requestClaim.mockReset().mockResolvedValue({ error: null });
  toast.mockReset();
  firstSuccess.mockReset();
  myRequests = [];
});

function Where() {
  const { pathname } = useLocation();
  return <p data-testid="where">{pathname}</p>;
}

function renderWho() {
  render(
    <MemoryRouter initialEntries={['/welcome/who']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/welcome/who" element={<WhoAreYouPage />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('WhoAreYouPage', () => {
  it('lists only players nobody has claimed, by name', () => {
    renderWho();
    expect(screen.getByRole('heading', { name: 'Which one is you?' })).toBeInTheDocument();
    expect(screen.getByText('Friday Night Game')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dan' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Maya' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sam' })).not.toBeInTheDocument();
  });

  it('"That\'s me" claims the picked player, then goes home', async () => {
    renderWho();
    const confirm = screen.getByRole('button', { name: "That's me" });
    expect(confirm).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Maya' }));
    expect(screen.getByRole('button', { name: 'Maya' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(confirm);
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/'));
    expect(requestClaim).toHaveBeenCalledWith('p-maya');
    expect(firstSuccess).toHaveBeenCalledWith('claim', true);
  });

  it('a claim is not the first when the user has claimed before', async () => {
    myRequests = [{ id: 'r-old' }];
    renderWho();
    fireEvent.click(screen.getByRole('button', { name: 'Maya' }));
    fireEvent.click(screen.getByRole('button', { name: "That's me" }));
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/'));
    expect(firstSuccess).toHaveBeenCalledWith('claim', false);
  });

  it('stays put when the claim fails', async () => {
    requestClaim.mockResolvedValue({ error: new Error('nope') });
    renderWho();
    fireEvent.click(screen.getByRole('button', { name: 'Dan' }));
    fireEvent.click(screen.getByRole('button', { name: "That's me" }));
    await waitFor(() => expect(requestClaim).toHaveBeenCalledWith('p-dan'));
    expect(screen.queryByTestId('where')).not.toBeInTheDocument();
    expect(firstSuccess).not.toHaveBeenCalled();
  });

  it('"Skip, I\'m just watching" goes home without a claim', () => {
    renderWho();
    fireEvent.click(screen.getByRole('button', { name: "Skip, I'm just watching" }));
    expect(screen.getByTestId('where')).toHaveTextContent('/');
    expect(requestClaim).not.toHaveBeenCalled();
  });

  it('"I\'m not on the list" goes home and says how to get added', () => {
    renderWho();
    fireEvent.click(screen.getByRole('button', { name: "I'm not on the list" }));
    expect(screen.getByTestId('where')).toHaveTextContent('/');
    expect(requestClaim).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'Ask your host to add you, then claim your name from Players.' })
    );
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';

const joinHomegame = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuthContext: () => ({ user: { id: 'user-2' }, loading: false, joinHomegame }),
}));

import { JoinPage } from './JoinPage';

let store: Map<string, string>;
beforeEach(() => {
  store = new Map();
  vi.stubGlobal('localStorage', {
    getItem: vi.fn((k: string) => store.get(k) ?? null),
    setItem: vi.fn((k: string, v: string) => void store.set(k, v)),
    removeItem: vi.fn((k: string) => void store.delete(k)),
  });
  joinHomegame.mockReset().mockResolvedValue({ error: null });
});
afterEach(() => vi.unstubAllGlobals());

function Where() {
  const { pathname } = useLocation();
  return <p data-testid="where">{pathname}</p>;
}

function renderJoin(entry = '/welcome/join') {
  render(
    <MemoryRouter initialEntries={[entry]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/welcome/join" element={<JoinPage />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('JoinPage', () => {
  it('fills in the code from the link', () => {
    renderJoin('/welcome/join?code=k7q4-4mxp');
    expect(screen.getByLabelText('Invite code')).toHaveValue('K7Q44MXP');
    expect(screen.getByText('Filled in from your invite link.')).toBeInTheDocument();
  });

  it('fills in the code saved on this device', () => {
    store.set('pendingInviteCode', JSON.stringify({ code: 'ABCD1234', savedAt: Date.now() }));
    renderJoin();
    expect(screen.getByLabelText('Invite code')).toHaveValue('ABCD1234');
  });

  it('joins, forgets the saved code and asks who you are', async () => {
    store.set('pendingInviteCode', JSON.stringify({ code: 'ABCD1234', savedAt: Date.now() }));
    renderJoin();
    fireEvent.click(screen.getByRole('button', { name: 'Join homegame' }));
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/welcome/who'));
    expect(joinHomegame).toHaveBeenCalledWith('ABCD1234');
    expect(store.has('pendingInviteCode')).toBe(false);
    expect(store.get('welcome_seen')).toBe('1');
  });

  it('shows the error and stays when the code is wrong', async () => {
    joinHomegame.mockResolvedValue({ error: new Error('Invalid invite code') });
    renderJoin();
    fireEvent.change(screen.getByLabelText('Invite code'), { target: { value: 'ZZZZ9999' } });
    fireEvent.click(screen.getByRole('button', { name: 'Join homegame' }));
    expect(await screen.findByText('Invalid invite code')).toBeInTheDocument();
    expect(screen.queryByTestId('where')).not.toBeInTheDocument();
  });

  it('Back returns to the choice screen', () => {
    renderJoin();
    fireEvent.click(screen.getByRole('button', { name: /Back/ }));
    expect(screen.getByTestId('where')).toHaveTextContent('/welcome');
  });

  // A dead saved code would otherwise send this user back to the join step on
  // every sign-in for up to 7 days.
  it.each([
    'Invalid or inactive invite code',
    'This invite code has expired',
    'This invite code has reached its maximum uses',
  ])('forgets the saved code when joining says "%s"', async (message) => {
    store.set('pendingInviteCode', JSON.stringify({ code: 'ABCD1234', savedAt: Date.now() }));
    joinHomegame.mockResolvedValue({ error: new Error(message) });
    renderJoin();
    fireEvent.click(screen.getByRole('button', { name: 'Join homegame' }));
    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(store.has('pendingInviteCode')).toBe(false);
  });

  it('keeps the saved code when joining fails for another reason', async () => {
    store.set('pendingInviteCode', JSON.stringify({ code: 'ABCD1234', savedAt: Date.now() }));
    joinHomegame.mockResolvedValue({ error: new Error('Failed to join homegame') });
    renderJoin();
    fireEvent.click(screen.getByRole('button', { name: 'Join homegame' }));
    expect(await screen.findByText('Failed to join homegame')).toBeInTheDocument();
    expect(store.has('pendingInviteCode')).toBe(true);
  });

  it('Back forgets the saved code so sign-in stops returning here', () => {
    store.set('pendingInviteCode', JSON.stringify({ code: 'ABCD1234', savedAt: Date.now() }));
    renderJoin();
    fireEvent.click(screen.getByRole('button', { name: /Back/ }));
    expect(screen.getByTestId('where')).toHaveTextContent('/welcome');
    expect(store.has('pendingInviteCode')).toBe(false);
  });

  it('keeps the saved code when a different, typed code is rejected', async () => {
    store.set('pendingInviteCode', JSON.stringify({ code: 'ABCD1234', savedAt: Date.now() }));
    joinHomegame.mockResolvedValue({ error: new Error('Invalid or inactive invite code') });
    renderJoin();
    fireEvent.change(screen.getByLabelText('Invite code'), { target: { value: 'ZZZZ9999' } });
    fireEvent.click(screen.getByRole('button', { name: 'Join homegame' }));
    expect(await screen.findByText('Invalid or inactive invite code')).toBeInTheDocument();
    expect(store.has('pendingInviteCode')).toBe(true);
  });
});

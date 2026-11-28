import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { getChecklist } from '@/lib/onboarding/checklist';
import type { InviteCode } from '@/types/database';

const createInviteCode = vi.fn();
let activeInviteCodes: Partial<InviteCode>[] = [];
vi.mock('@/hooks/useInviteCodes', () => ({
  useInviteCodes: () => ({ activeInviteCodes, loading: false, createInviteCode }),
}));
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }));

import { GettingStartedCard } from './GettingStartedCard';

const base = {
  createdAt: '2026-12-05T10:00:00.000Z',
  isOwner: true,
  playerCount: 3,
  memberCount: 1,
  sessionCount: 1,
  inviteShared: false,
};

let store: Map<string, string>;
let onInviteShared: ReturnType<typeof vi.fn>;
beforeEach(() => {
  store = new Map();
  vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) });
  activeInviteCodes = [];
  createInviteCode.mockReset().mockResolvedValue({ error: null, code: { id: 'c1', code: 'K7Q44MXP' } });
  onInviteShared = vi.fn();
});

function renderCard(input = base) {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <GettingStartedCard
        homegameId="hg-1"
        homegameName="Friday Night Game"
        checklist={getChecklist(input)}
        onInviteShared={onInviteShared}
      />
    </MemoryRouter>
  );
}

describe('GettingStartedCard', () => {
  it('shows progress and the four items', () => {
    renderCard();
    expect(screen.getByText('Getting started')).toBeInTheDocument();
    expect(screen.getByText('3 of 4')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '3');
    for (const label of ['Create your game', 'Add 2 or more players', 'Invite your crew', 'Log your first game']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('links undone players and game items to where you do them', () => {
    renderCard({ ...base, playerCount: 1, sessionCount: 0 });
    expect(screen.getByRole('link', { name: /add players/i })).toHaveAttribute('href', '/players');
    expect(screen.getByRole('link', { name: /log your first game/i })).toHaveAttribute('href', '/new-session?seat=all');
  });

  it('offers no action on done items', () => {
    renderCard({ ...base, memberCount: 2, sessionCount: 0 });
    expect(screen.queryByRole('button', { name: /share/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /add players/i })).not.toBeInTheDocument();
  });

  it('shares an existing invite code and ticks the item', async () => {
    activeInviteCodes = [{ code: 'ABCD2345', is_active: true, expires_at: null, max_uses: null, uses_count: 0, created_at: '2026-12-05T10:00:00Z' }];
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText }, share: undefined });
    renderCard();
    fireEvent.click(screen.getByRole('button', { name: /share/i }));
    await waitFor(() => expect(onInviteShared).toHaveBeenCalled());
    expect(createInviteCode).not.toHaveBeenCalled();
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('/auth?mode=signup&code=ABCD2345'));
    expect(store.get('invite_shared:hg-1')).toBe('1');
  });

  it('makes a code quietly when there is none, then shares it', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...navigator, share });
    renderCard();
    fireEvent.click(screen.getByRole('button', { name: /share/i }));
    await waitFor(() => expect(onInviteShared).toHaveBeenCalled());
    expect(createInviteCode).toHaveBeenCalledWith(expect.objectContaining({ quiet: true }));
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ text: expect.stringContaining('K7Q44MXP') }));
    expect(store.get('invite_shared:hg-1')).toBe('1');
  });

  it('leaves the item open when the share sheet is dismissed', async () => {
    const share = vi.fn().mockRejectedValue(Object.assign(new Error('cancel'), { name: 'AbortError' }));
    vi.stubGlobal('navigator', { ...navigator, share });
    renderCard();
    fireEvent.click(screen.getByRole('button', { name: /share/i }));
    await waitFor(() => expect(share).toHaveBeenCalled());
    expect(onInviteShared).not.toHaveBeenCalled();
    expect(store.has('invite_shared:hg-1')).toBe(false);
  });
});

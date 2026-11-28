import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useNavigate } from 'react-router-dom';

const state = vi.hoisted(() => ({
  homegame: { id: 'hg-1' } as { id: string } | null,
  /** What the next live_sessions fetch returns. */
  row: null as object | null,
  calls: 0,
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuthContext: () => ({ user: { id: 'u1' }, homegame: state.homegame }),
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => {
            state.calls += 1;
            return { data: state.row, error: null };
          },
        }),
      }),
    }),
  },
}));

import { LiveSessionProvider, useLiveSession } from './LiveSessionContext';

const mount = (path = '/sessions') =>
  renderHook(() => ({ live: useLiveSession(), navigate: useNavigate() }), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={[path]}>
        <LiveSessionProvider>{children}</LiveSessionProvider>
      </MemoryRouter>
    ),
  });

beforeEach(() => {
  state.homegame = { id: 'hg-1' };
  state.row = null;
  state.calls = 0;
});

describe('LiveSessionProvider fetchCount', () => {
  it('starts at 0 and counts the first fetch when it comes back', async () => {
    const { result } = mount();
    expect(result.current.live.fetchCount).toBe(0);
    await waitFor(() => expect(result.current.live.fetchCount).toBe(1));
    expect(result.current.live.loading).toBe(false);
  });

  it('counts the re-check made when Home opens, with its answer', async () => {
    const { result } = mount('/sessions');
    await waitFor(() => expect(result.current.live.fetchCount).toBe(1));

    state.row = { id: 'ls1', players: [] };
    act(() => result.current.navigate('/'));
    await waitFor(() => expect(result.current.live.fetchCount).toBe(2));
    expect(result.current.live.liveSession).toMatchObject({ id: 'ls1' });
  });

  it('counts a check without a homegame too', async () => {
    state.homegame = null;
    const { result } = mount();
    await waitFor(() => expect(result.current.live.fetchCount).toBe(1));
    expect(state.calls).toBe(0);
  });
});

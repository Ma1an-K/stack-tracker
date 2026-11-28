import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

const mocks = vi.hoisted(() => ({ toast: vi.fn() }));

// Minimal chainable client: the fetch returns no codes, the insert returns the new one.
vi.mock('@/integrations/supabase/client', () => {
  const chain = (result: unknown) => {
    const q: Record<string, unknown> = {};
    for (const m of ['select', 'eq', 'order', 'insert']) q[m] = () => q;
    q.single = () => Promise.resolve(result);
    q.then = (ok: (v: unknown) => unknown, err?: (e: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(ok, err);
    return q;
  };
  return {
    supabase: {
      from: () => chain({ data: { id: 'c1', code: 'K7Q44MXP', is_active: true }, error: null }),
      rpc: () => Promise.resolve({ data: 'K7Q44MXP', error: null }),
      auth: { getSession: () => Promise.resolve({ data: { session: { user: { id: 'u1' } } } }) },
    },
  };
});
vi.mock('@/hooks/use-toast', () => ({ toast: mocks.toast }));
vi.mock('@/lib/errorLog', () => ({ logError: vi.fn() }));

import { useInviteCodes } from './useInviteCodes';

beforeEach(() => mocks.toast.mockReset());

describe('useInviteCodes.createInviteCode', () => {
  it('toasts on success by default', async () => {
    const { result } = renderHook(() => useInviteCodes('h1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await result.current.createInviteCode(); });
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ description: 'Invite code created' }));
  });

  it('stays quiet when asked, and still returns the new code', async () => {
    const { result } = renderHook(() => useInviteCodes('h1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    let res: Awaited<ReturnType<typeof result.current.createInviteCode>> | undefined;
    await act(async () => { res = await result.current.createInviteCode({ quiet: true }); });
    expect(mocks.toast).not.toHaveBeenCalled();
    expect((res as { code?: { code: string } }).code?.code).toBe('K7Q44MXP');
    expect(result.current.activeInviteCodes.map((c) => c.code)).toEqual(['K7Q44MXP']);
  });
});

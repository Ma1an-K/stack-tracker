import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const getSession = vi.fn();
const insert = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getSession: (...a: unknown[]) => getSession(...a) },
    from: vi.fn(() => ({ insert: (...a: unknown[]) => insert(...a) })),
  },
}));

import { logError, __resetErrorLogForTests } from './errorLog';

const flush = async () => {
  for (let i = 0; i < 10; i++) await Promise.resolve();
};

beforeEach(() => {
  vi.useFakeTimers();
  __resetErrorLogForTests();
  getSession.mockReset().mockResolvedValue({ data: { session: { user: { id: 'u' } } } });
  insert.mockReset().mockResolvedValue({ error: null });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('logError', () => {
  it('inserts a truncated row', async () => {
    history.pushState({}, '', '/live?x=1');
    const err = new Error('m'.repeat(3000));
    err.stack = 's'.repeat(9000);
    logError({ kind: 'crash', action: 'a'.repeat(300), error: err, homegameId: 'hg1' });
    await flush();
    expect(insert).toHaveBeenCalledTimes(1);
    const row = insert.mock.calls[0][0];
    expect(row.message.length).toBe(2000);
    expect(row.stack.length).toBeLessThanOrEqual(8000);
    expect(row.action.length).toBeLessThanOrEqual(200);
    expect(row.page).toBe('/live');
    expect(row.user_agent.length).toBeLessThanOrEqual(400);
    expect(row.app_version).toBe('test');
    expect(row.homegame_id).toBe('hg1');
    expect(row.kind).toBe('crash');
    expect(row).not.toHaveProperty('user_id');
  });

  it('no session -> no insert', async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    logError({ kind: 'crash', error: new Error('x') });
    await flush();
    expect(insert).not.toHaveBeenCalled();
  });

  it('dedupes within 60s', async () => {
    logError({ kind: 'save_failed', action: 'x', error: 'same' });
    logError({ kind: 'save_failed', action: 'x', error: 'same' });
    await flush();
    expect(insert).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(61_000);
    logError({ kind: 'save_failed', action: 'x', error: 'same' });
    await flush();
    expect(insert).toHaveBeenCalledTimes(2);
  });

  it('caps at 20 per page load', async () => {
    for (let i = 0; i < 25; i++) logError({ kind: 'crash', error: `msg ${i}` });
    await flush();
    expect(insert).toHaveBeenCalledTimes(20);
  });

  it('never throws when insert rejects', async () => {
    insert.mockRejectedValue(new Error('network down'));
    const unhandled = vi.fn();
    process.on('unhandledRejection', unhandled);
    expect(() => logError({ kind: 'crash', error: new Error('x') })).not.toThrow();
    await flush();
    process.off('unhandledRejection', unhandled);
    expect(insert).toHaveBeenCalledTimes(1);
    expect(unhandled).not.toHaveBeenCalled();
  });

  it('never throws when getSession rejects', async () => {
    getSession.mockRejectedValue(new Error('boom'));
    expect(() => logError({ kind: 'crash', error: new Error('x') })).not.toThrow();
    await flush();
    expect(insert).not.toHaveBeenCalled();
  });

  it('accepts non-Error values', async () => {
    logError({ kind: 'crash', error: 'boom' });
    logError({ kind: 'crash', error: { message: 'x' } });
    await flush();
    expect(insert.mock.calls[0][0].message).toBe('boom');
    expect(insert.mock.calls[1][0].message).toBe('x');
  });
});

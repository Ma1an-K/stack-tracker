import { describe, it, expect } from 'vitest';
import { getChecklist, ONBOARDING_CUTOFF } from './checklist';

const fresh = {
  createdAt: '2026-12-05T10:00:00.000Z',
  isOwner: true,
  playerCount: 1,
  memberCount: 1,
  sessionCount: 0,
  inviteShared: false,
};

const done = (input: Parameters<typeof getChecklist>[0], id: string) =>
  getChecklist(input).items.find((i) => i.id === id)?.done;

describe('getChecklist', () => {
  it('lists the four items in order, with create always done', () => {
    const list = getChecklist(fresh);
    expect(list.items.map((i) => i.id)).toEqual(['create', 'players', 'invite', 'game']);
    expect(done(fresh, 'create')).toBe(true);
    expect(list.doneCount).toBe(1);
    expect(list.visible).toBe(true);
  });

  it('ticks players at 2 or more active players', () => {
    expect(done({ ...fresh, playerCount: 1 }, 'players')).toBe(false);
    expect(done({ ...fresh, playerCount: 2 }, 'players')).toBe(true);
  });

  it('ticks invite when someone else joined or the invite was shared', () => {
    expect(done(fresh, 'invite')).toBe(false);
    expect(done({ ...fresh, memberCount: 2 }, 'invite')).toBe(true);
    expect(done({ ...fresh, inviteShared: true }, 'invite')).toBe(true);
  });

  it('ticks game once a session exists', () => {
    expect(done(fresh, 'game')).toBe(false);
    expect(done({ ...fresh, sessionCount: 1 }, 'game')).toBe(true);
  });

  it('counts done items', () => {
    expect(getChecklist({ ...fresh, playerCount: 3, sessionCount: 1 }).doneCount).toBe(3);
  });

  it('hides once all four are done', () => {
    const list = getChecklist({ ...fresh, playerCount: 2, memberCount: 2, sessionCount: 1 });
    expect(list.doneCount).toBe(4);
    expect(list.visible).toBe(false);
  });

  it('only shows to the owner', () => {
    expect(getChecklist({ ...fresh, isOwner: false }).visible).toBe(false);
  });

  it('shows from the cutoff date on', () => {
    expect(getChecklist({ ...fresh, createdAt: ONBOARDING_CUTOFF }).visible).toBe(true);
    expect(getChecklist({ ...fresh, createdAt: `${ONBOARDING_CUTOFF}T00:00:00.000Z` }).visible).toBe(true);
  });

  it('never shows for a homegame created before the cutoff', () => {
    expect(getChecklist({ ...fresh, createdAt: '2026-11-30T23:59:59.000Z' }).visible).toBe(false);
    expect(getChecklist({ ...fresh, createdAt: '2024-01-01T00:00:00.000Z' }).visible).toBe(false);
  });

  it('uses 2026-12-01 as the cutoff until release', () => {
    expect(ONBOARDING_CUTOFF).toBe('2026-12-01');
  });
});

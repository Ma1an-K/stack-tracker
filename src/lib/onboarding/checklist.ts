/**
 * Homegames created on or after this date get the Getting started checklist;
 * older ones never do. Set to the release date when this ships.
 */
export const ONBOARDING_CUTOFF = '2026-11-28';

export type ChecklistItemId = 'create' | 'players' | 'invite' | 'game';

export interface ChecklistInput {
  createdAt: string;
  isOwner: boolean;
  playerCount: number;
  memberCount: number;
  sessionCount: number;
  inviteShared: boolean;
}

export interface Checklist {
  visible: boolean;
  items: { id: ChecklistItemId; done: boolean }[];
  doneCount: number;
}

/** Worked out from real data, so it is right on any device. */
export function getChecklist(input: ChecklistInput): Checklist {
  const items: Checklist['items'] = [
    { id: 'create', done: true },
    { id: 'players', done: input.playerCount >= 2 },
    { id: 'invite', done: input.memberCount >= 2 || input.inviteShared },
    { id: 'game', done: input.sessionCount >= 1 },
  ];
  const doneCount = items.filter((i) => i.done).length;
  const isNew = Date.parse(input.createdAt) >= Date.parse(ONBOARDING_CUTOFF);
  return { visible: input.isOwner && isNew && doneCount < items.length, items, doneCount };
}

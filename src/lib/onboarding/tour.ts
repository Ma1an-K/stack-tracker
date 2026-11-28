import type { HomegameRole } from '@/types/database';

/**
 * Accounts created at or after this instant see the tour once, automatically.
 * Set it to the exact deploy instant with offset: a bare date parses as UTC
 * midnight (11:00 AEDT) and would admit accounts made before the deploy.
 */
export const TOUR_RELEASE = '2026-11-28T00:00:00+11:00';

export type TourRole = 'host' | 'member' | 'solo';

export function tourRole(homegame: { role: HomegameRole } | null): TourRole {
  if (!homegame) return 'solo';
  return homegame.role === 'member' ? 'member' : 'host';
}

export interface TourCard {
  id: string;
  illustration: 'log' | 'oneoff' | 'settle' | 'standings' | 'stats' | 'run' | 'crew';
  title: string;
  body: string;
  where: string;
}

export const TOUR_CARDS: Record<TourRole, TourCard[]> = {
  host: [
    {
      id: 'log',
      illustration: 'log',
      title: 'Log every game',
      body: 'Tap + to play live and track buy-ins and rebuys as they happen, or enter the final totals once the game is done.',
      where: 'The + button',
    },
    {
      id: 'settle',
      illustration: 'settle',
      title: 'Settle up in seconds',
      body: 'Every game works out who pays whom in the fewest transfers. Tick payments off as they come in, or share the result with the group.',
      where: 'Sessions',
    },
    {
      id: 'standings',
      illustration: 'standings',
      title: 'Standings and badges',
      body: 'A running leaderboard for your crew, with badges for streaks, big nights and milestones.',
      where: 'Standings',
    },
    {
      id: 'run',
      illustration: 'run',
      title: 'Run your homegame',
      body: 'Invite players, approve people claiming their name, and make trusted players admins. It’s all in the menu.',
      where: 'The menu, top right',
    },
  ],
  member: [
    {
      id: 'log',
      illustration: 'log',
      title: 'Log every game',
      body: 'Anyone in the homegame can log a game. Tap + to play live or enter the final totals afterwards.',
      where: 'The + button',
    },
    {
      id: 'settle',
      illustration: 'settle',
      title: 'Settle up in seconds',
      body: 'Each game shows who pays whom in the fewest transfers, so nobody does the maths at the table.',
      where: 'Sessions',
    },
    {
      id: 'standings',
      illustration: 'standings',
      title: 'Standings and badges',
      body: 'See where you rank in the crew and the badges you’ve earned along the way.',
      where: 'Standings',
    },
    {
      id: 'stats',
      illustration: 'stats',
      title: 'Your own stats',
      body: 'Your results across every game and homegame, once your host confirms which player is you. The sidepot calculator is in the menu too.',
      where: 'Stats',
    },
  ],
  solo: [
    {
      id: 'log',
      illustration: 'oneoff',
      title: 'Log any game',
      body: 'Tap + to run a live game or enter final totals. No homegame or setup needed.',
      where: 'The + button',
    },
    {
      id: 'settle',
      illustration: 'settle',
      title: 'Settle up in seconds',
      body: 'Get who pays whom in the fewest transfers, then save the game to your history.',
      where: 'Home, saved games',
    },
    {
      id: 'crew',
      illustration: 'crew',
      title: 'Same crew every week?',
      body: 'Start a homegame for running standings, badges and stats, or join one with a code from your host.',
      where: 'Home',
    },
  ],
};

/**
 * True only for an account created at or after TOUR_RELEASE that has not seen
 * the tour. A profile without seen_tips (frontend shipped before the column)
 * is never eligible, so nothing shows and nothing is written.
 */
export function isTourEligible(profile: { created_at: string; seen_tips?: string[] } | null): boolean {
  if (!profile || profile.seen_tips === undefined) return false;
  if (profile.seen_tips.includes('tour')) return false;
  return Date.parse(profile.created_at) >= Date.parse(TOUR_RELEASE);
}

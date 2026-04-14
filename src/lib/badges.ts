import { SessionWithPlayers, Player } from '@/types/database';

export interface BadgeDefinition {
  id: string;
  name: string;
  emoji: string;
  description: string;
  category: 'competitive' | 'streak' | 'milestone' | 'achievement';
}

export interface PlayerBadge {
  badge: BadgeDefinition;
  value?: number;
}

export const BADGE_DEFINITIONS: Record<string, BadgeDefinition> = {
  heater:      { id: 'heater',      name: 'Heater',      emoji: '🔥', description: 'Winning sessions in a row',                                        category: 'streak'      },
  ice_cold:    { id: 'ice_cold',    name: 'Ice Cold',    emoji: '🥶', description: 'Losing sessions in a row',                                         category: 'streak'      },
  high_roller: { id: 'high_roller', name: 'High Roller', emoji: '💰', description: 'Biggest single-session profit of all time',                        category: 'competitive' },
  donkey:      { id: 'donkey',      name: 'Donkey',      emoji: '🫏', description: 'Biggest single-session loss of all time',                          category: 'competitive' },
  shark:       { id: 'shark',       name: 'Shark',       emoji: '🦈', description: 'Ranked #1 on this month\'s leaderboard',                         category: 'competitive' },
  atm:         { id: 'atm',         name: 'ATM',         emoji: '🏧', description: 'Has donated the most to the group this month',                       category: 'competitive' },
  grinder:     { id: 'grinder',     name: 'Grinder',     emoji: '⚙️', description: 'Most sessions played',                                             category: 'milestone'   },
  dead_money:  { id: 'dead_money',  name: 'Dead Money',  emoji: '👻', description: '3 losing months in a row',                                        category: 'achievement' },
  whale:       { id: 'whale',       name: 'Whale',       emoji: '🐋', description: 'Highest average buy-in per session (min. 3 sessions)',             category: 'milestone'   },
};

interface PlayerSessionData {
  date: string;
  buyIn: number;
  cashOut: number;
  profit: number;
}

/**
 * Compute all badges for every player in a homegame.
 * Returns a Map of player_id -> PlayerBadge[]
 */
export function computeHomegameBadges(
  sessions: SessionWithPlayers[],
  players: Player[]
): Map<string, PlayerBadge[]> {
  const badgeMap = new Map<string, PlayerBadge[]>();
  players.forEach(p => badgeMap.set(p.id, []));

  // Build per-player session history sorted by date
  const playerSessions = new Map<string, PlayerSessionData[]>();
  players.forEach(p => playerSessions.set(p.id, []));

  const sortedSessions = [...sessions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  sortedSessions.forEach(session => {
    session.session_players.forEach(sp => {
      const list = playerSessions.get(sp.player_id);
      if (list) {
        const buyIn = Number(sp.buy_in);
        const cashOut = Number(sp.cash_out);
        list.push({ date: session.date, buyIn, cashOut, profit: cashOut - buyIn });
      }
    });
  });

  computeStreaks(playerSessions, badgeMap);
  computeCompetitiveBadges(playerSessions, badgeMap);
  computeMilestoneBadges(playerSessions, badgeMap);
  computeAchievementBadges(playerSessions, badgeMap);

  return badgeMap;
}

function computeStreaks(
  playerSessions: Map<string, PlayerSessionData[]>,
  badgeMap: Map<string, PlayerBadge[]>
) {
  playerSessions.forEach((sessions, playerId) => {
    if (sessions.length < 2) return;
    const badges = badgeMap.get(playerId)!;

    // Count current streak from the end
    const lastSession = sessions[sessions.length - 1];
    const isWinning = lastSession.profit >= 0;

    let streak = 0;
    for (let i = sessions.length - 1; i >= 0; i--) {
      const won = sessions[i].profit >= 0;
      if (won === isWinning) {
        streak++;
      } else {
        break;
      }
    }

    if (streak >= 3) {
      if (isWinning) {
        badges.push({ badge: BADGE_DEFINITIONS.heater, value: streak });
      } else {
        badges.push({ badge: BADGE_DEFINITIONS.ice_cold, value: streak });
      }
    }
  });
}

function computeCompetitiveBadges(
  playerSessions: Map<string, PlayerSessionData[]>,
  badgeMap: Map<string, PlayerBadge[]>
) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  let maxSingleProfit = -Infinity;
  let highRollerPlayerId: string | null = null;

  let maxSingleLoss = -Infinity; // stored as positive magnitude
  let donkeyPlayerId: string | null = null;

  let maxMonthlyProfit = -Infinity;
  let sharkPlayerId: string | null = null;

  let maxMonthlyLoss = -Infinity; // stored as positive magnitude
  let atmPlayerId: string | null = null;

  playerSessions.forEach((sessions, playerId) => {
    if (sessions.length === 0) return;

    for (const s of sessions) {
      if (s.profit > maxSingleProfit) {
        maxSingleProfit = s.profit;
        highRollerPlayerId = playerId;
      }
      if (-s.profit > maxSingleLoss) {
        maxSingleLoss = -s.profit;
        donkeyPlayerId = playerId;
      }
    }

    const monthlySessions = sessions.filter(s => {
      const d = new Date(s.date);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    });

    if (monthlySessions.length > 0) {
      const monthlyProfit = monthlySessions.reduce((sum, s) => sum + s.profit, 0);
      if (monthlyProfit > maxMonthlyProfit) {
        maxMonthlyProfit = monthlyProfit;
        sharkPlayerId = playerId;
      }

      const monthlyLoss = monthlySessions.reduce((sum, s) => sum + (s.profit < 0 ? -s.profit : 0), 0);
      if (monthlyLoss > maxMonthlyLoss) {
        maxMonthlyLoss = monthlyLoss;
        atmPlayerId = playerId;
      }
    }
  });

  if (highRollerPlayerId && maxSingleProfit > 0)
    badgeMap.get(highRollerPlayerId)!.push({ badge: BADGE_DEFINITIONS.high_roller, value: maxSingleProfit });

  if (donkeyPlayerId && maxSingleLoss > 0)
    badgeMap.get(donkeyPlayerId)!.push({ badge: BADGE_DEFINITIONS.donkey, value: maxSingleLoss });

  if (sharkPlayerId !== null)
    badgeMap.get(sharkPlayerId)!.push({ badge: BADGE_DEFINITIONS.shark, value: maxMonthlyProfit });

  if (atmPlayerId && maxMonthlyLoss > 0)
    badgeMap.get(atmPlayerId)!.push({ badge: BADGE_DEFINITIONS.atm, value: maxMonthlyLoss });
}

function computeMilestoneBadges(
  playerSessions: Map<string, PlayerSessionData[]>,
  badgeMap: Map<string, PlayerBadge[]>
) {
  let maxSessionCount = 0;
  let grinderPlayerId: string | null = null;

  let maxAvgBuyIn = 0;
  let whalePlayerId: string | null = null;

  playerSessions.forEach((sessions, playerId) => {
    if (sessions.length === 0) return;

    if (sessions.length > maxSessionCount) {
      maxSessionCount = sessions.length;
      grinderPlayerId = playerId;
    }

    if (sessions.length >= 3) {
      const avgBuyIn = sessions.reduce((sum, s) => sum + s.buyIn, 0) / sessions.length;
      if (avgBuyIn > maxAvgBuyIn) {
        maxAvgBuyIn = avgBuyIn;
        whalePlayerId = playerId;
      }
    }
  });

  if (grinderPlayerId && maxSessionCount >= 1)
    badgeMap.get(grinderPlayerId)!.push({ badge: BADGE_DEFINITIONS.grinder, value: maxSessionCount });

  if (whalePlayerId)
    badgeMap.get(whalePlayerId)!.push({ badge: BADGE_DEFINITIONS.whale, value: Math.round(maxAvgBuyIn) });
}

function computeAchievementBadges(
  playerSessions: Map<string, PlayerSessionData[]>,
  badgeMap: Map<string, PlayerBadge[]>
) {
  // Dead Money: 3 consecutive calendar months where net profit across all sessions that month is negative
  playerSessions.forEach((sessions, playerId) => {
    if (sessions.length === 0) return;

    // Group sessions by year-month
    const byMonth = new Map<string, number>();
    for (const s of sessions) {
      const d = new Date(s.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      byMonth.set(key, (byMonth.get(key) ?? 0) + s.profit);
    }

    // Sort months chronologically
    const months = [...byMonth.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    if (months.length < 3) return;

    // Check for 3 consecutive losing months anywhere in history
    let consecutive = 0;
    for (const [, profit] of months) {
      if (profit < 0) {
        consecutive++;
        if (consecutive >= 3) {
          badgeMap.get(playerId)!.push({ badge: BADGE_DEFINITIONS.dead_money });
          return;
        }
      } else {
        consecutive = 0;
      }
    }
  });
}

export function sortBadges(badges: PlayerBadge[]): PlayerBadge[] {
  return [...badges];
}

import { SessionWithPlayers, PlayerStats, Player } from '@/types/database';
import { startOfWeek, startOfMonth, startOfYear, isAfter, parseISO } from 'date-fns';

export type TimeFrame = 'all' | 'week' | 'month' | 'year';

export function filterSessionsByTimeFrame(
  sessions: SessionWithPlayers[],
  timeFrame: TimeFrame
): SessionWithPlayers[] {
  if (timeFrame === 'all') return sessions;

  const now = new Date();
  let cutoffDate: Date;

  switch (timeFrame) {
    case 'week':
      cutoffDate = startOfWeek(now, { weekStartsOn: 1 });
      break;
    case 'month':
      cutoffDate = startOfMonth(now);
      break;
    case 'year':
      cutoffDate = startOfYear(now);
      break;
    default:
      return sessions;
  }

  return sessions.filter(session => {
    const sessionDate = parseISO(session.date);
    return isAfter(sessionDate, cutoffDate) || sessionDate.getTime() === cutoffDate.getTime();
  });
}

export function calculateLeaderboard(
  sessions: SessionWithPlayers[],
  allPlayers: Player[]
): PlayerStats[] {
  const statsMap = new Map<string, PlayerStats>();

  // Initialize all players with zero stats
  allPlayers.forEach(player => {
    statsMap.set(player.id, {
      player,
      totalBuyIn: 0,
      totalCashOut: 0,
      netProfit: 0,
      sessionsPlayed: 0,
      avgProfit: 0,
    });
  });

  // Aggregate stats from sessions
  sessions.forEach(session => {
    session.session_players.forEach(sp => {
      const existing = statsMap.get(sp.player_id);
      if (existing) {
        const buyIn = Number(sp.buy_in);
        const cashOut = Number(sp.cash_out);
        existing.totalBuyIn += buyIn;
        existing.totalCashOut += cashOut;
        existing.netProfit += cashOut - buyIn;
        existing.sessionsPlayed += 1;
      }
    });
  });

  // Calculate averages and convert to array
  const stats = Array.from(statsMap.values())
    .map(stat => ({
      ...stat,
      avgProfit: stat.sessionsPlayed > 0 ? stat.netProfit / stat.sessionsPlayed : 0,
    }))
    .filter(stat => stat.sessionsPlayed > 0) // Only show players with sessions
    .sort((a, b) => b.netProfit - a.netProfit); // Sort by profit

  return stats;
}

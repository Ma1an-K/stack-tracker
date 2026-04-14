import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Player, SessionWithPlayers, Settlement, Homegame } from '@/types/database';
import { calculateSettlements } from '@/lib/settlement';
import { calculateLeaderboard } from '@/lib/leaderboard';
import { computeHomegameBadges, PlayerBadge } from '@/lib/badges';

export interface PersonalStats {
  totalProfit: number;
  totalBuyIn: number;
  totalCashOut: number;
  sessionsPlayed: number;
  avgProfit: number;
  biggestWin: number;
  biggestLoss: number;
  stdDev: number;
  winRate: number;         // 0–100 percentage
  longestWinStreak: number;
  longestLossStreak: number;
}

export interface SessionDataPoint {
  date: string;
  sessionNumber: number;
  profit: number;
  cumProfit: number;
}

export interface HomegameStats {
  homegame: Homegame;
  player: Player;
  stats: PersonalStats;
  pendingSettlements: Settlement[];
  leaderboardPosition: number | null;
  totalPlayers: number;
  badges: PlayerBadge[];
  sessionHistory: SessionDataPoint[];
}

export interface RecentSession {
  id: string;
  date: string;
  homegameName: string;
  currency: string;
  buyIn: number;
  cashOut: number;
  profit: number;
}

export function usePersonalStats() {
  const [homegameStats, setHomegameStats] = useState<HomegameStats[]>([]);
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
  const [overallStats, setOverallStats] = useState<PersonalStats | null>(null);
  const [allSessionHistory, setAllSessionHistory] = useState<SessionDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPersonalStats();
  }, []);

  const fetchPersonalStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Get all players claimed by this user
      const { data: myPlayers, error: playersError } = await supabase
        .from('players')
        .select(`
          *,
          homegame:homegames(*)
        `)
        .eq('user_id', user.id);

      if (playersError) throw playersError;

      if (!myPlayers || myPlayers.length === 0) {
        setLoading(false);
        return;
      }

      const playerIds = myPlayers.map(p => p.id);

      // Get all session_players for my players
      const { data: sessionPlayersData, error: spError } = await supabase
        .from('session_players')
        .select(`
          *,
          session:sessions(*)
        `)
        .in('player_id', playerIds);

      if (spError) throw spError;

      // Build recent sessions list
      const recent: RecentSession[] = (sessionPlayersData || []).map(sp => {
        const player = myPlayers.find(p => p.id === sp.player_id);
        const homegame = player?.homegame as Homegame;
        return {
          id: sp.session_id,
          date: (sp.session as any).date,
          homegameName: homegame?.name || 'Unknown',
          currency: homegame?.currency || '$',
          buyIn: Number(sp.buy_in),
          cashOut: Number(sp.cash_out),
          profit: Number(sp.cash_out) - Number(sp.buy_in),
        };
      }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setRecentSessions(recent.slice(0, 10)); // Last 10 sessions

      // Calculate per-homegame stats
      const statsPerHomegame: HomegameStats[] = [];

      for (const myPlayer of myPlayers) {
        const homegame = myPlayer.homegame as Homegame;
        if (!homegame) continue;

        const mySessions = (sessionPlayersData || []).filter(sp => sp.player_id === myPlayer.id);

        // Sort sessions chronologically for accurate streak + history
        const sortedSessions = [...mySessions].sort(
          (a, b) => new Date((a.session as any).date).getTime() - new Date((b.session as any).date).getTime()
        );

        let totalBuyIn = 0;
        let totalCashOut = 0;
        let biggestWin = 0;
        let biggestLoss = 0;
        const profits: number[] = [];

        sortedSessions.forEach(sp => {
          const buyIn = Number(sp.buy_in);
          const cashOut = Number(sp.cash_out);
          const profit = cashOut - buyIn;
          totalBuyIn += buyIn;
          totalCashOut += cashOut;
          if (profit > biggestWin) biggestWin = profit;
          if (profit < biggestLoss) biggestLoss = profit;
          profits.push(profit);
        });

        // Session history for chart
        const sessionHistory: SessionDataPoint[] = sortedSessions.map((sp, i) => ({
          date: (sp.session as any).date,
          sessionNumber: i + 1,
          profit: profits[i],
          cumProfit: profits.slice(0, i + 1).reduce((a, b) => a + b, 0),
        }));

        // Variance & win rate
        const mean = profits.length > 0 ? profits.reduce((a, b) => a + b, 0) / profits.length : 0;
        const variance = profits.length > 0
          ? profits.reduce((s, p) => s + Math.pow(p - mean, 2), 0) / profits.length
          : 0;
        const stdDev = Math.sqrt(variance);
        const winRate = profits.length > 0
          ? (profits.filter(p => p > 0).length / profits.length) * 100
          : 0;

        // Best/worst streak records
        let longestWinStreak = 0, longestLossStreak = 0;
        let curWin = 0, curLoss = 0;
        for (const p of profits) {
          if (p > 0) { curWin++; curLoss = 0; longestWinStreak = Math.max(longestWinStreak, curWin); }
          else        { curLoss++; curWin = 0; longestLossStreak = Math.max(longestLossStreak, curLoss); }
        }

        const netProfit = totalCashOut - totalBuyIn;
        const sessionsPlayed = mySessions.length;

        // Get unsettled sessions for this homegame to calculate pending settlements
        const { data: unsettledSessions, error: unsettledError } = await supabase
          .from('sessions')
          .select(`
            *,
            session_players(*, player:players(*))
          `)
          .eq('homegame_id', homegame.id)
          .eq('is_settled', false);

        if (unsettledError) throw unsettledError;

        // Get all sessions for leaderboard calculation
        const { data: allSessions, error: allSessionsError } = await supabase
          .from('sessions')
          .select(`
            *,
            session_players(*, player:players(*))
          `)
          .eq('homegame_id', homegame.id);

        if (allSessionsError) throw allSessionsError;

        // Get all players for leaderboard
        const { data: allPlayersInHomegame, error: allPlayersError } = await supabase
          .from('players')
          .select('*')
          .eq('homegame_id', homegame.id);

        if (allPlayersError) throw allPlayersError;

        // Calculate leaderboard position
        let leaderboardPosition: number | null = null;
        let totalPlayers = 0;
        
        let playerBadges: PlayerBadge[] = [];
        if (allSessions && allPlayersInHomegame) {
          const leaderboard = calculateLeaderboard(
            allSessions as SessionWithPlayers[],
            allPlayersInHomegame
          );
          totalPlayers = leaderboard.length;
          const playerIndex = leaderboard.findIndex(p => p.player.id === myPlayer.id);
          if (playerIndex !== -1) {
            leaderboardPosition = playerIndex + 1;
          }

          // Compute badges
          const badgeMap = computeHomegameBadges(
            allSessions as SessionWithPlayers[],
            allPlayersInHomegame
          );
          playerBadges = badgeMap.get(myPlayer.id) || [];
        }

        // Calculate settlements for unsettled sessions involving this player
        // Sort by most recent first
        const sortedUnsettledSessions = (unsettledSessions || []).sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        
        const pendingSettlements: Settlement[] = [];
        sortedUnsettledSessions.forEach(session => {
          const sessionPlayers = (session as any).session_players || [];
          if (sessionPlayers.some((sp: any) => sp.player_id === myPlayer.id)) {
            const settlements = calculateSettlements(sessionPlayers);
            // Filter settlements involving this player
            settlements.forEach(s => {
              if (s.from.id === myPlayer.id || s.to.id === myPlayer.id) {
                pendingSettlements.push(s);
              }
            });
          }
        });

        statsPerHomegame.push({
          homegame,
          player: myPlayer as Player,
          stats: {
            totalProfit: netProfit,
            totalBuyIn,
            totalCashOut,
            sessionsPlayed,
            avgProfit: sessionsPlayed > 0 ? netProfit / sessionsPlayed : 0,
            biggestWin,
            biggestLoss,
            stdDev,
            winRate,
            longestWinStreak,
            longestLossStreak,
          },
          pendingSettlements,
          leaderboardPosition,
          totalPlayers,
          badges: playerBadges,
          sessionHistory,
        });
      }

      setHomegameStats(statsPerHomegame);

      // Build overall chronological session history across all homegames
      const combinedHistory = statsPerHomegame
        .flatMap(h => h.sessionHistory.map(pt => ({ ...pt, currency: h.homegame.currency })))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      let cumSum = 0;
      const overallHistory: SessionDataPoint[] = combinedHistory.map((pt, i) => {
        cumSum += pt.profit;
        return { date: pt.date, sessionNumber: i + 1, profit: pt.profit, cumProfit: cumSum };
      });
      setAllSessionHistory(overallHistory);

      // Calculate overall stats
      if (statsPerHomegame.length > 0) {
        const allProfits = overallHistory.map(p => p.profit);
        const totalProfit = statsPerHomegame.reduce((acc, h) => acc + h.stats.totalProfit, 0);
        const sessionsPlayed = statsPerHomegame.reduce((acc, h) => acc + h.stats.sessionsPlayed, 0);
        const overallMean = sessionsPlayed > 0 ? totalProfit / sessionsPlayed : 0;
        const overallVariance = allProfits.length > 0
          ? allProfits.reduce((s, p) => s + Math.pow(p - overallMean, 2), 0) / allProfits.length
          : 0;
        let oWin = 0, oLoss = 0, oCurW = 0, oCurL = 0;
        for (const p of allProfits) {
          if (p > 0) { oCurW++; oCurL = 0; oWin = Math.max(oWin, oCurW); }
          else        { oCurL++; oCurW = 0; oLoss = Math.max(oLoss, oCurL); }
        }
        const overall: PersonalStats = {
          totalProfit,
          totalBuyIn: statsPerHomegame.reduce((acc, h) => acc + h.stats.totalBuyIn, 0),
          totalCashOut: statsPerHomegame.reduce((acc, h) => acc + h.stats.totalCashOut, 0),
          sessionsPlayed,
          avgProfit: overallMean,
          biggestWin: Math.max(...statsPerHomegame.map(h => h.stats.biggestWin)),
          biggestLoss: Math.min(...statsPerHomegame.map(h => h.stats.biggestLoss)),
          stdDev: Math.sqrt(overallVariance),
          winRate: allProfits.length > 0 ? (allProfits.filter(p => p > 0).length / allProfits.length) * 100 : 0,
          longestWinStreak: oWin,
          longestLossStreak: oLoss,
        };
        setOverallStats(overall);
      }

    } catch (err) {
      console.error('Error fetching personal stats:', err);
    } finally {
      setLoading(false);
    }
  };

  return {
    homegameStats,
    recentSessions,
    overallStats,
    allSessionHistory,
    loading,
    refetch: fetchPersonalStats,
  };
}

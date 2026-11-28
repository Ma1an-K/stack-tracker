import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { HomegameStats } from '@/hooks/usePersonalStats';

const TIP = 'Your results show here once your host confirms your name.';

let homegameStats: HomegameStats[] = [];

vi.mock('@/contexts/AuthContext', () => ({
  useAuthContext: () => ({
    profile: { id: 'u1', username: 'dana', discriminator: '0001' },
    homegames: [{ id: 'hg-1', currency: '$' }],
    homegame: { id: 'hg-1', currency: '$', role: 'member' },
    isOwner: false,
  }),
}));

vi.mock('@/hooks/useTips', () => ({
  useTips: () => ({ shouldShow: () => true, markSeen: vi.fn() }),
}));

vi.mock('@/hooks/usePersonalStats', () => ({
  usePersonalStats: () => ({
    homegameStats,
    recentSessions: [],
    overallStats: null,
    allSessionHistory: [],
    loading: false,
  }),
}));

vi.mock('@/components/badges/PlayerBadges', () => ({ PlayerBadges: () => null }));
vi.mock('@/components/stats/ProfitChart', () => ({ ProfitChart: () => null }));

import { MyStatsPage } from './MyStatsPage';

const claimed = {
  homegame: { id: 'hg-1', name: 'Friday', currency: '$' },
  player: { id: 'p1', name: 'Dana' },
  stats: {
    totalProfit: 0, totalBuyIn: 0, totalCashOut: 0, sessionsPlayed: 0, avgProfit: 0,
    biggestWin: 0, biggestLoss: 0, stdDev: 0, winRate: 0, longestWinStreak: 0, longestLossStreak: 0,
  },
  pendingSettlements: [],
  leaderboardPosition: null,
  totalPlayers: 1,
  badges: [],
  sessionHistory: [],
} as unknown as HomegameStats;

function renderPage() {
  render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <MyStatsPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  homegameStats = [];
});

describe('MyStatsPage member tip', () => {
  it('shows to a member who has not claimed a player yet', () => {
    renderPage();
    expect(screen.getByText(TIP)).toBeInTheDocument();
  });

  it('stays hidden once the member has a claimed player', () => {
    homegameStats = [claimed];
    renderPage();
    expect(screen.queryByText(TIP)).not.toBeInTheDocument();
  });
});

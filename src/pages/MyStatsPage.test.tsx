import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { HomegameStats } from '@/hooks/usePersonalStats';

const TIP = 'Your results show here once your host confirms your name.';
const CLAIM_TIP = 'Claim your player: find your name in Players and tap “This is me”.';

let homegameStats: HomegameStats[] = [];
let myRequests: { id: string; player_id: string; user_id: string; status: string }[] = [];
let claimsLoading = false;

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

vi.mock('@/hooks/usePlayerClaims', () => ({
  usePlayerClaims: () => ({ myRequests, loading: claimsLoading }),
}));

vi.mock('@/hooks/usePlayers', () => ({
  usePlayers: () => ({
    players: [
      { id: 'p1', name: 'Dana', homegame_id: 'hg-1', user_id: null },
      { id: 'p2', name: 'Avi', homegame_id: 'hg-1', user_id: null },
    ],
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
  myRequests = [];
  claimsLoading = false;
});

describe('MyStatsPage member tip', () => {
  it('tells a member with no pending request to claim their player', () => {
    renderPage();
    expect(screen.getByText(CLAIM_TIP)).toBeInTheDocument();
    expect(screen.queryByText(TIP)).not.toBeInTheDocument();
    expect(screen.getByText('Claim your player first')).toBeInTheDocument();
  });

  it('ignores a pending request for a player in another homegame', () => {
    myRequests = [{ id: 'r1', player_id: 'other-hg-player', user_id: 'u1', status: 'pending' }];
    renderPage();
    expect(screen.getByText(CLAIM_TIP)).toBeInTheDocument();
    expect(screen.queryByText(TIP)).not.toBeInTheDocument();
  });

  it('ignores a rejected request in this homegame', () => {
    myRequests = [{ id: 'r1', player_id: 'p2', user_id: 'u1', status: 'rejected' }];
    renderPage();
    expect(screen.getByText(CLAIM_TIP)).toBeInTheDocument();
  });

  it('waits for the host when the member has a pending request in this homegame', () => {
    myRequests = [{ id: 'r1', player_id: 'p2', user_id: 'u1', status: 'pending' }];
    renderPage();
    expect(screen.getByText(TIP)).toBeInTheDocument();
    expect(screen.queryByText(CLAIM_TIP)).not.toBeInTheDocument();
    expect(screen.getByText('Waiting for your host')).toBeInTheDocument();
    expect(screen.getByText(/You asked to be Avi\./)).toBeInTheDocument();
    expect(screen.queryByText('Claim your player first')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to Players' })).toBeInTheDocument();
  });

  it('shows no tip while claim requests are still loading', () => {
    claimsLoading = true;
    renderPage();
    expect(screen.queryByText(TIP)).not.toBeInTheDocument();
    expect(screen.queryByText(CLAIM_TIP)).not.toBeInTheDocument();
  });

  it('stays hidden once the member has a claimed player', () => {
    homegameStats = [claimed];
    myRequests = [{ id: 'r1', player_id: 'p2', user_id: 'u1', status: 'pending' }];
    renderPage();
    expect(screen.queryByText(TIP)).not.toBeInTheDocument();
    expect(screen.queryByText(CLAIM_TIP)).not.toBeInTheDocument();
  });
});

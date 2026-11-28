import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const state = vi.hoisted(() => ({
  homegame: null as { id: string; name: string; currency: string; role: string; icon_id: null } | null,
  maybeAutoOpen: vi.fn(),
  tourOpen: false,
  sessionCount: null as number | null,
  showTips: false,
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuthContext: () => ({
    profile: { id: 'u1', username: 'dana', display_name: 'Dana' },
    homegames: state.homegame ? [state.homegame] : [],
    homegame: state.homegame,
    isOwner: false,
    selectHomegame: vi.fn(),
  }),
}));

vi.mock('@/contexts/TourContext', () => ({
  useTour: () => ({
    open: false,
    role: 'host',
    openTour: vi.fn(),
    closeTour: vi.fn(),
    maybeAutoOpen: state.maybeAutoOpen,
  }),
  useTourOpen: () => state.tourOpen,
}));

vi.mock('@/contexts/LiveSessionContext', () => ({ useLiveSession: () => ({ liveSession: null, loading: false }) }));
vi.mock('@/hooks/usePersonalStats', () => ({
  usePersonalStats: () => ({ homegameStats: [], recentSessions: [], overallStats: null, loading: false }),
}));
vi.mock('@/hooks/useGettingStarted', () => ({
  useGettingStarted: () => ({ checklist: { visible: false }, sessionCount: state.sessionCount, onInviteShared: vi.fn() }),
}));
vi.mock('@/hooks/useTips', () => ({ useTips: () => ({ shouldShow: () => state.showTips, markSeen: vi.fn() }) }));
vi.mock('@/components/install/InstallBanner', () => ({ InstallBanner: () => null }));
vi.mock('@/components/sessions/LiveSessionCard', () => ({ LiveSessionCard: () => null }));
vi.mock('@/components/home/NoHomegameHome', () => ({ NoHomegameHome: () => <p>No homegame home</p> }));

import { DashboardPage } from './DashboardPage';

const renderPage = () =>
  render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <DashboardPage />
    </MemoryRouter>,
  );

beforeEach(() => {
  state.maybeAutoOpen = vi.fn();
  state.homegame = null;
  state.tourOpen = false;
  state.sessionCount = null;
  state.showTips = false;
});

describe('DashboardPage tour auto-open', () => {
  it('asks the tour to auto-open on mount with a homegame', () => {
    state.homegame = { id: 'hg-1', name: 'Friday game', currency: '$', role: 'owner', icon_id: null };
    renderPage();
    expect(state.maybeAutoOpen).toHaveBeenCalledTimes(1);
  });

  it('asks the tour to auto-open on mount with no homegame', () => {
    const { getByText } = renderPage();
    expect(getByText('No homegame home')).toBeInTheDocument();
    expect(state.maybeAutoOpen).toHaveBeenCalledTimes(1);
  });
});

describe('DashboardPage one-time tips and the tour', () => {
  const PLUS_TIP = 'Next game starts here';
  beforeEach(() => {
    state.homegame = { id: 'hg-1', name: 'Friday game', currency: '$', role: 'owner', icon_id: null };
    state.sessionCount = 1;
    state.showTips = true;
  });

  it('shows no home-plus tip while the tour is open', () => {
    state.tourOpen = true;
    const { queryByText } = renderPage();
    expect(queryByText(PLUS_TIP)).not.toBeInTheDocument();
  });

  it('shows the home-plus tip once the tour has closed', () => {
    state.tourOpen = true;
    const { queryByText, getByText, rerender } = renderPage();
    expect(queryByText(PLUS_TIP)).not.toBeInTheDocument();
    state.tourOpen = false;
    rerender(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <DashboardPage />
      </MemoryRouter>,
    );
    expect(getByText(PLUS_TIP)).toBeInTheDocument();
  });
});

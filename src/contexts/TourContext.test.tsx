import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, render, screen, fireEvent } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useNavigate } from 'react-router-dom';

type Profile = { created_at: string; seen_tips?: string[] } | null;

const state = vi.hoisted(() => ({
  auth: {} as {
    profile: { created_at: string; seen_tips?: string[] } | null;
    homegame: { role: 'owner' | 'admin' | 'member' } | null;
    loading: boolean;
    userDataPending: boolean;
  },
  live: {} as { liveSession: object | null; loading: boolean; fetchCount: number },
  markSeen: vi.fn(),
  /** Tips dismissed this session (useTips hides them before the profile save lands). */
  dismissed: [] as string[],
}));

vi.mock('@/contexts/AuthContext', () => ({ useAuthContext: () => state.auth }));
vi.mock('@/contexts/LiveSessionContext', () => ({ useLiveSession: () => state.live }));
vi.mock('@/hooks/useTips', () => ({
  useTips: () => ({ markSeen: state.markSeen, shouldShow: (id: string) => !state.dismissed.includes(id) }),
}));

import { TourProvider, useTour, useTourHoldsInstall, useTourOpen, HOME_REQUEST_WINDOW_MS, TOUR_EXIT_MS } from './TourContext';
import { TOUR_RELEASE } from '@/lib/onboarding/tour';

const NEW: Profile = { created_at: new Date(Date.parse(TOUR_RELEASE) + 60_000).toISOString(), seen_tips: [] };
const OLD: Profile = { created_at: new Date(Date.parse(TOUR_RELEASE) - 60_000).toISOString(), seen_tips: [] };

const mount = (path = '/') =>
  renderHook(() => ({ tour: useTour(), holds: useTourHoldsInstall() }), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={[path]}>
        <TourProvider>{children}</TourProvider>
      </MemoryRouter>
    ),
  });

beforeEach(() => {
  state.auth = { profile: NEW, homegame: { role: 'owner' }, loading: false, userDataPending: false };
  // fetchCount 1: the shell's first live-session fetch has completed.
  state.live = { liveSession: null, loading: false, fetchCount: 1 };
  state.dismissed = [];
  // A failed save: the profile keeps no 'tour', but useTips hides it for this session.
  state.markSeen = vi.fn((id: string) => {
    state.dismissed.push(id);
  });
});
afterEach(() => {
  vi.useRealTimers();
});

describe('TourProvider', () => {
  it('starts closed', () => {
    const { result } = mount();
    expect(result.current.tour.open).toBe(false);
  });

  it('auto-opens for an eligible account', () => {
    const { result } = mount();
    act(() => result.current.tour.maybeAutoOpen());
    expect(result.current.tour.open).toBe(true);
    expect(result.current.tour.role).toBe('host');
  });

  it('never auto-opens for an account created before the release', () => {
    state.auth.profile = OLD;
    const { result } = mount();
    act(() => result.current.tour.maybeAutoOpen());
    expect(result.current.tour.open).toBe(false);
  });

  it('does not auto-open for an account that has seen it', () => {
    state.auth.profile = { ...NEW!, seen_tips: ['tour'] };
    const { result } = mount();
    act(() => result.current.tour.maybeAutoOpen());
    expect(result.current.tour.open).toBe(false);
  });

  it('does not auto-open while user data is pending', () => {
    state.auth.userDataPending = true;
    const { result } = mount();
    act(() => result.current.tour.maybeAutoOpen());
    expect(result.current.tour.open).toBe(false);
  });

  it('does not auto-open while auth is loading', () => {
    state.auth.loading = true;
    const { result } = mount();
    act(() => result.current.tour.maybeAutoOpen());
    expect(result.current.tour.open).toBe(false);
  });

  it('does not auto-open during a live game', () => {
    state.live = { liveSession: { id: 'ls1' }, loading: false, fetchCount: 1 };
    const { result } = mount();
    act(() => result.current.tour.maybeAutoOpen());
    expect(result.current.tour.open).toBe(false);
  });

  it('waits for the live-session check before deciding', () => {
    state.live = { liveSession: null, loading: true, fetchCount: 1 };
    const { result, rerender } = mount();
    act(() => result.current.tour.maybeAutoOpen());
    expect(result.current.tour.open).toBe(false);

    state.live = { liveSession: { id: 'ls1' }, loading: false, fetchCount: 1 };
    rerender();
    expect(result.current.tour.open).toBe(false);
  });

  it('opens once the live-session check finds no game', () => {
    state.live = { liveSession: null, loading: true, fetchCount: 1 };
    const { result, rerender } = mount();
    act(() => result.current.tour.maybeAutoOpen());
    expect(result.current.tour.open).toBe(false);

    state.live = { liveSession: null, loading: false, fetchCount: 1 };
    rerender();
    expect(result.current.tour.open).toBe(true);
  });

  it('auto-opens only once per mount', () => {
    const { result } = mount();
    act(() => result.current.tour.maybeAutoOpen());
    act(() => result.current.tour.closeTour());
    act(() => result.current.tour.maybeAutoOpen());
    act(() => result.current.tour.maybeAutoOpen());
    expect(result.current.tour.open).toBe(false);
  });

  it('closeTour closes and records the tour as seen', () => {
    const { result } = mount();
    act(() => result.current.tour.maybeAutoOpen());
    act(() => result.current.tour.closeTour());
    expect(result.current.tour.open).toBe(false);
    expect(state.markSeen).toHaveBeenCalledWith('tour');
  });

  it('openTour opens regardless of eligibility', () => {
    state.auth.profile = OLD;
    state.live = { liveSession: { id: 'ls1' }, loading: false, fetchCount: 1 };
    const { result } = mount();
    act(() => result.current.tour.openTour());
    expect(result.current.tour.open).toBe(true);
  });

  it('takes the role from the homegame at the moment it opens', () => {
    state.auth.homegame = { role: 'member' };
    const { result, rerender } = mount();
    act(() => result.current.tour.openTour());
    expect(result.current.tour.role).toBe('member');

    // A homegame switch while open does not change the cards mid-tour.
    state.auth.homegame = null;
    rerender();
    expect(result.current.tour.role).toBe('member');

    act(() => result.current.tour.closeTour());
    act(() => result.current.tour.openTour());
    expect(result.current.tour.role).toBe('solo');
  });

  it('holds the install sheet while an auto-open is still to be decided, while open, and through the exit animation', () => {
    vi.useFakeTimers();
    state.live = { liveSession: null, loading: true, fetchCount: 1 };
    const { result, rerender } = mount();
    expect(result.current.holds).toBe(true);

    act(() => result.current.tour.maybeAutoOpen());
    state.live = { liveSession: null, loading: false, fetchCount: 1 };
    rerender();
    expect(result.current.tour.open).toBe(true);
    expect(result.current.holds).toBe(true);

    act(() => result.current.tour.closeTour());
    expect(result.current.tour.open).toBe(false);
    // The sheet slides out for TOUR_EXIT_MS; the install sheet waits for it.
    expect(result.current.holds).toBe(true);
    act(() => vi.advanceTimersByTime(TOUR_EXIT_MS - 1));
    expect(result.current.holds).toBe(true);
    act(() => vi.advanceTimersByTime(1));
    expect(result.current.holds).toBe(false);
  });

  it('cleans up the exit-animation timer on unmount', () => {
    vi.useFakeTimers();
    const { result, unmount } = mount('/sessions');
    act(() => result.current.tour.openTour());
    const set = vi.spyOn(globalThis, 'setTimeout');
    act(() => result.current.tour.closeTour());
    const exitCall = set.mock.calls.findIndex(([, ms]) => ms === TOUR_EXIT_MS);
    expect(exitCall).toBeGreaterThanOrEqual(0);
    const exitTimer = set.mock.results[exitCall].value;
    const clear = vi.spyOn(globalThis, 'clearTimeout');
    unmount();
    expect(clear).toHaveBeenCalledWith(exitTimer);
  });

  it('does not auto-open again after a replay whose save failed (seen this session)', () => {
    const { result } = renderHook(() => ({ tour: useTour(), navigate: useNavigate() }), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <MemoryRouter initialEntries={['/sessions']}>
          <TourProvider>{children}</TourProvider>
        </MemoryRouter>
      ),
    });
    // Replay from the menu before Home was ever visited; the save fails, so the
    // profile still has no 'tour' and isTourEligible alone would say yes.
    act(() => result.current.tour.openTour());
    act(() => result.current.tour.closeTour());
    expect(state.auth.profile!.seen_tips).not.toContain('tour');

    act(() => result.current.navigate('/'));
    state.live = { ...state.live, fetchCount: 2 };
    act(() => result.current.tour.maybeAutoOpen());
    expect(result.current.tour.open).toBe(false);
  });

  it('does not hold the install sheet on Home once the tour was seen this session', () => {
    state.dismissed = ['tour'];
    const { result } = mount();
    expect(result.current.holds).toBe(false);
  });

  it('does not hold the install sheet for an account that will never auto-open', () => {
    state.auth.profile = OLD;
    const { result } = mount();
    expect(result.current.holds).toBe(false);
  });

  it('releases the hold once the auto-open decides not to open', () => {
    state.live = { liveSession: { id: 'ls1' }, loading: false, fetchCount: 1 };
    const { result } = mount();
    expect(result.current.holds).toBe(true);
    act(() => result.current.tour.maybeAutoOpen());
    expect(result.current.tour.open).toBe(false);
    expect(result.current.holds).toBe(false);
  });

  it('does not hold the install sheet off Home before a decision (only Home auto-opens)', () => {
    const { result } = mount('/one-off');
    expect(result.current.tour.open).toBe(false);
    expect(result.current.holds).toBe(false);
  });

  it('still holds off Home while the tour is open', () => {
    state.auth.profile = OLD;
    const { result } = mount('/sessions');
    act(() => result.current.tour.openTour());
    expect(result.current.holds).toBe(true);
  });

  it('drops a pending auto-open when the user leaves Home before the decision', () => {
    state.live = { liveSession: null, loading: true, fetchCount: 1 };
    const { result, rerender } = renderHook(
      () => ({ tour: useTour(), navigate: useNavigate() }),
      {
        wrapper: ({ children }: { children: ReactNode }) => (
          <MemoryRouter initialEntries={['/']}>
            <TourProvider>{children}</TourProvider>
          </MemoryRouter>
        ),
      },
    );
    act(() => result.current.tour.maybeAutoOpen());
    act(() => result.current.navigate('/sessions'));

    // The live-session check comes back while the user is on another page.
    state.live = { liveSession: null, loading: false, fetchCount: 1 };
    rerender();
    expect(result.current.tour.open).toBe(false);

    // Back on Home without a fresh request: the old one is gone.
    act(() => result.current.navigate('/'));
    expect(result.current.tour.open).toBe(false);

    // Home asks again on its next mount; it opens once Home's own live-session
    // re-check is back.
    act(() => result.current.tour.maybeAutoOpen());
    expect(result.current.tour.open).toBe(false);
    state.live = { liveSession: null, loading: false, fetchCount: 2 };
    rerender();
    expect(result.current.tour.open).toBe(true);
  });

  describe('fresh live-session check on Home', () => {
    const fromSessions = () =>
      renderHook(() => ({ tour: useTour(), holds: useTourHoldsInstall(), navigate: useNavigate() }), {
        wrapper: ({ children }: { children: ReactNode }) => (
          <MemoryRouter initialEntries={['/sessions']}>
            <TourProvider>{children}</TourProvider>
          </MemoryRouter>
        ),
      });

    it('does not open over a live game that arrives with the Home re-check', () => {
      const { result, rerender } = fromSessions();
      act(() => result.current.navigate('/'));
      act(() => result.current.tour.maybeAutoOpen());
      // The last answer (from before Home) said no game; it is stale now.
      expect(result.current.tour.open).toBe(false);
      expect(result.current.holds).toBe(true);

      state.live = { liveSession: { id: 'ls1' }, loading: false, fetchCount: 2 };
      rerender();
      expect(result.current.tour.open).toBe(false);
      expect(result.current.holds).toBe(false);
    });

    it('opens once the Home re-check comes back with no game', () => {
      const { result, rerender } = fromSessions();
      act(() => result.current.navigate('/'));
      act(() => result.current.tour.maybeAutoOpen());
      expect(result.current.tour.open).toBe(false);

      state.live = { liveSession: null, loading: false, fetchCount: 2 };
      rerender();
      expect(result.current.tour.open).toBe(true);
    });

    it('accepts a re-check that came back before Home asked (lazy route)', () => {
      const { result, rerender } = fromSessions();
      act(() => result.current.navigate('/'));
      state.live = { liveSession: null, loading: false, fetchCount: 2 };
      rerender();
      act(() => result.current.tour.maybeAutoOpen());
      expect(result.current.tour.open).toBe(true);
    });
  });

  describe('when Home never asks (e.g. it failed to render)', () => {
    it('holds the install sheet only for a bounded window', () => {
      vi.useFakeTimers();
      const { result } = mount();
      expect(result.current.holds).toBe(true);
      act(() => vi.advanceTimersByTime(HOME_REQUEST_WINDOW_MS - 1));
      expect(result.current.holds).toBe(true);
      act(() => vi.advanceTimersByTime(1));
      expect(result.current.holds).toBe(false);
    });

    it('keeps holding past the window once Home has asked and the decision is pending', () => {
      vi.useFakeTimers();
      state.live = { liveSession: null, loading: true, fetchCount: 0 };
      const { result } = mount();
      act(() => result.current.tour.maybeAutoOpen());
      act(() => vi.advanceTimersByTime(HOME_REQUEST_WINDOW_MS * 2));
      expect(result.current.holds).toBe(true);
    });

    it('opens the window again on the next Home visit', () => {
      vi.useFakeTimers();
      const { result } = renderHook(
        () => ({ holds: useTourHoldsInstall(), navigate: useNavigate() }),
        {
          wrapper: ({ children }: { children: ReactNode }) => (
            <MemoryRouter initialEntries={['/']}>
              <TourProvider>{children}</TourProvider>
            </MemoryRouter>
          ),
        },
      );
      act(() => vi.advanceTimersByTime(HOME_REQUEST_WINDOW_MS));
      expect(result.current.holds).toBe(false);
      act(() => result.current.navigate('/sessions'));
      act(() => result.current.navigate('/'));
      expect(result.current.holds).toBe(true);
    });
  });

  it('openTour shows the real tour sheet with the first card', () => {
    function Opener() {
      const { openTour } = useTour();
      return <button onClick={openTour}>open</button>;
    }
    render(
      <MemoryRouter initialEntries={['/']}>
        <TourProvider>
          <Opener />
        </TourProvider>
      </MemoryRouter>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'open' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Log every game' })).toBeInTheDocument();
  });

  it('useTour throws outside the provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useTour())).toThrow(/TourProvider/);
  });

  it('useTourOpen follows the sheet, and is false outside the provider', () => {
    const { result } = renderHook(() => ({ tour: useTour(), open: useTourOpen() }), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <MemoryRouter initialEntries={['/sessions']}>
          <TourProvider>{children}</TourProvider>
        </MemoryRouter>
      ),
    });
    expect(result.current.open).toBe(false);
    act(() => result.current.tour.openTour());
    expect(result.current.open).toBe(true);
    act(() => result.current.tour.closeTour());
    expect(result.current.open).toBe(false);
    expect(renderHook(() => useTourOpen()).result.current).toBe(false);
  });

  it('useTourHoldsInstall is false outside the provider', () => {
    const { result } = renderHook(() => useTourHoldsInstall());
    expect(result.current).toBe(false);
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';

type Profile = { created_at: string; seen_tips?: string[] } | null;

const state = vi.hoisted(() => ({
  auth: {} as {
    profile: { created_at: string; seen_tips?: string[] } | null;
    homegame: { role: 'owner' | 'admin' | 'member' } | null;
    loading: boolean;
    userDataPending: boolean;
  },
  live: {} as { liveSession: object | null; loading: boolean },
  markSeen: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({ useAuthContext: () => state.auth }));
vi.mock('@/contexts/LiveSessionContext', () => ({ useLiveSession: () => state.live }));
vi.mock('@/hooks/useTips', () => ({ useTips: () => ({ markSeen: state.markSeen, shouldShow: () => false }) }));

import { TourProvider, useTour, useTourHoldsInstall } from './TourContext';

const NEW: Profile = { created_at: '2026-11-29T10:00:00Z', seen_tips: [] };
const OLD: Profile = { created_at: '2026-10-01T10:00:00Z', seen_tips: [] };

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
  state.live = { liveSession: null, loading: false };
  state.markSeen = vi.fn();
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
    state.live = { liveSession: { id: 'ls1' }, loading: false };
    const { result } = mount();
    act(() => result.current.tour.maybeAutoOpen());
    expect(result.current.tour.open).toBe(false);
  });

  it('waits for the live-session check before deciding', () => {
    state.live = { liveSession: null, loading: true };
    const { result, rerender } = mount();
    act(() => result.current.tour.maybeAutoOpen());
    expect(result.current.tour.open).toBe(false);

    state.live = { liveSession: { id: 'ls1' }, loading: false };
    rerender();
    expect(result.current.tour.open).toBe(false);
  });

  it('opens once the live-session check finds no game', () => {
    state.live = { liveSession: null, loading: true };
    const { result, rerender } = mount();
    act(() => result.current.tour.maybeAutoOpen());
    expect(result.current.tour.open).toBe(false);

    state.live = { liveSession: null, loading: false };
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
    state.live = { liveSession: { id: 'ls1' }, loading: false };
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

  it('holds the install sheet while an auto-open is still to be decided, and while open', () => {
    state.live = { liveSession: null, loading: true };
    const { result, rerender } = mount();
    expect(result.current.holds).toBe(true);

    act(() => result.current.tour.maybeAutoOpen());
    state.live = { liveSession: null, loading: false };
    rerender();
    expect(result.current.tour.open).toBe(true);
    expect(result.current.holds).toBe(true);

    act(() => result.current.tour.closeTour());
    expect(result.current.holds).toBe(false);
  });

  it('does not hold the install sheet for an account that will never auto-open', () => {
    state.auth.profile = OLD;
    const { result } = mount();
    expect(result.current.holds).toBe(false);
  });

  it('releases the hold once the auto-open decides not to open', () => {
    state.live = { liveSession: { id: 'ls1' }, loading: false };
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

  it('useTour throws outside the provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useTour())).toThrow(/TourProvider/);
  });

  it('useTourHoldsInstall is false outside the provider', () => {
    const { result } = renderHook(() => useTourHoldsInstall());
    expect(result.current).toBe(false);
  });
});

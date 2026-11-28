import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FeatureTour } from './FeatureTour';
import type { TourRole } from '@/lib/onboarding/tour';

const WIDTH = 320;

/** jsdom doesn't lay out: give the track a width and a scrollTo that scrolls instantly. */
function layoutTrack() {
  const track = screen.getByTestId('tour-track');
  Object.defineProperty(track, 'clientWidth', { configurable: true, value: WIDTH });
  Object.defineProperty(track, 'scrollLeft', { configurable: true, writable: true, value: 0 });
  const scrollTo = vi.fn(({ left }: ScrollToOptions) => {
    track.scrollLeft = left ?? 0;
    fireEvent.scroll(track);
  });
  track.scrollTo = scrollTo as unknown as typeof track.scrollTo;
  return { track, scrollTo };
}

function setup(role: TourRole = 'host') {
  const onClose = vi.fn();
  const utils = render(<FeatureTour open role={role} onClose={onClose} />);
  return { onClose, ...utils, ...layoutTrack() };
}

describe('FeatureTour', () => {
  it('opens on the first host card', () => {
    setup('host');
    expect(screen.getByRole('dialog', { name: 'Feature tour' })).toBeInTheDocument();
    expect(screen.getByText('Log every game')).toBeInTheDocument();
    expect(screen.getByText('1 of 4')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();
  });

  it('Next scrolls to the next card and moves the counter', () => {
    const { scrollTo } = setup('host');
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ left: WIDTH }));
    expect(screen.getByText('2 of 4')).toBeInTheDocument();
  });

  it('uses an instant scroll when the user prefers reduced motion', () => {
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      ...original(query),
      matches: query.includes('prefers-reduced-motion'),
    })) as typeof window.matchMedia;
    try {
      const { scrollTo } = setup('host');
      fireEvent.click(screen.getByRole('button', { name: 'Next' }));
      expect(scrollTo).toHaveBeenCalledWith({ left: WIDTH, behavior: 'auto' });
    } finally {
      window.matchMedia = original;
    }
  });

  it('reads Let’s play on the last card and closes when tapped', () => {
    const { onClose } = setup('host');
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('4 of 4')).toBeInTheDocument();
    const play = screen.getByRole('button', { name: 'Let’s play' });
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(play);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Skip closes the tour', () => {
    const { onClose } = setup('host');
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Escape closes the tour through the sheet', () => {
    const { onClose } = setup('host');
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows three cards for a solo account', () => {
    setup('solo');
    expect(screen.getByText('1 of 3')).toBeInTheDocument();
    expect(screen.getByText('Log any game')).toBeInTheDocument();
  });

  it('a swipe updates the counter from the scroll position', () => {
    const { track } = setup('host');
    track.scrollLeft = 2 * WIDTH;
    fireEvent.scroll(track);
    expect(screen.getByText('3 of 4')).toBeInTheDocument();
  });

  it('returns to the first card when the role changes', () => {
    const { track, rerender, onClose } = setup('host');
    track.scrollLeft = 2 * WIDTH;
    fireEvent.scroll(track);
    expect(screen.getByText('3 of 4')).toBeInTheDocument();
    rerender(<FeatureTour open role="solo" onClose={onClose} />);
    expect(screen.getByText('1 of 3')).toBeInTheDocument();
    expect(track.scrollLeft).toBe(0);
  });

  it('returns to the first card when it reopens', () => {
    const { rerender, onClose } = setup('host');
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('2 of 4')).toBeInTheDocument();
    rerender(<FeatureTour open={false} role="host" onClose={onClose} />);
    rerender(<FeatureTour open role="host" onClose={onClose} />);
    expect(screen.getByText('1 of 4')).toBeInTheDocument();
  });

  it('renders nothing while closed', () => {
    render(<FeatureTour open={false} role="host" onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

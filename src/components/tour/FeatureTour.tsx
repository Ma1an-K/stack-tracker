import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { TOUR_CARDS, type TourRole } from '@/lib/onboarding/tour';
import { TourIllustration } from './TourIllustration';

interface FeatureTourProps {
  open: boolean;
  role: TourRole;
  /** Skip, finishing, the scrim or Escape. */
  onClose: () => void;
  /** Where focus goes when the sheet closes (the header menu trigger), if registered. */
  returnFocusRef?: MutableRefObject<HTMLElement | null>;
}

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// React 18 has no typed `inert` prop; an empty string renders the boolean attribute.
const OFFSCREEN = { 'aria-hidden': true, inert: '' } as Record<string, unknown>;

/** A swipe-through bottom sheet of what the app does, one card per feature. */
export function FeatureTour({ open, role, onClose, returnFocusRef }: FeatureTourProps) {
  const cards = TOUR_CARDS[role];
  const [index, setIndex] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const last = index === cards.length - 1;

  // Every opening, and a change of card set, starts from the first card.
  useEffect(() => {
    if (!open) return;
    setIndex(0);
    if (trackRef.current) trackRef.current.scrollLeft = 0;
  }, [open, role]);

  const onScroll = () => {
    const track = trackRef.current;
    if (!track || track.clientWidth === 0) return;
    const next = Math.min(cards.length - 1, Math.max(0, Math.round(track.scrollLeft / track.clientWidth)));
    setIndex(next);
  };

  const goNext = () => {
    if (last) {
      onClose();
      return;
    }
    const track = trackRef.current;
    if (!track) return;
    track.scrollTo({
      left: (index + 1) * track.clientWidth,
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    });
  };

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        side="bottom"
        aria-describedby={undefined}
        onCloseAutoFocus={(event) => {
          // A replay starts from the header menu, which has closed by then, so the
          // default would leave focus on <body>. Send it back to the menu trigger.
          const trigger = returnFocusRef?.current;
          if (!trigger || !trigger.isConnected) return;
          event.preventDefault();
          trigger.focus();
        }}
        className={cn(
          // Short or landscape screens scroll rather than clip the sheet.
          'max-h-[100dvh] overflow-y-auto',
          'rounded-t-[22px] bg-card px-0 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]',
          // Skip is the close control here, so drop the primitive's corner X.
          '[&>button:last-child]:hidden',
        )}
      >
        <div className="mx-auto max-w-md">
          <SheetTitle className="sr-only">Feature tour</SheetTitle>
          <div aria-hidden="true" className="mx-auto mb-1 h-1 w-10 rounded bg-border" />

          <div className="flex items-center justify-between px-5">
            <span
              aria-live="polite"
              className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gold tabular-nums"
            >
              {index + 1} of {cards.length}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="-mr-1 min-h-11 min-w-11 px-1 text-sm text-muted-foreground hover:text-foreground"
            >
              Skip
            </button>
          </div>

          <div
            ref={trackRef}
            data-testid="tour-track"
            onScroll={onScroll}
            className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {cards.map((card, i) => (
              <div
                key={card.id}
                // Off-screen cards are out of reach for screen readers and focus.
                {...(i === index ? {} : OFFSCREEN)}
                className="grid w-full shrink-0 snap-center gap-3 px-5 pb-1 pt-1.5"
              >
                <TourIllustration kind={card.illustration} />
                <h3 className="mt-1 font-display text-[1.625rem] font-semibold leading-tight">{card.title}</h3>
                <p className="min-h-[63px] text-sm text-muted-foreground">{card.body}</p>
                <span className="inline-flex items-center gap-1.5 text-xs text-foreground">
                  <span className="text-gold">Where</span>
                  {card.where}
                </span>
              </div>
            ))}
          </div>

          <div aria-hidden="true" className="mb-3.5 mt-3 flex justify-center gap-1.5">
            {cards.map((card, i) => (
              <i
                key={card.id}
                className={cn(
                  'h-1.5 rounded-full transition-all motion-reduce:transition-none',
                  i === index ? 'w-5 bg-gold' : 'w-1.5 bg-border',
                )}
              />
            ))}
          </div>

          <div className="px-5">
            <Button
              onClick={goNext}
              className="min-h-[50px] w-full rounded-[14px] bg-gradient-to-b from-gold-bright to-gold text-[15px] font-semibold text-gold-foreground"
            >
              {last ? 'Let’s play' : 'Next'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

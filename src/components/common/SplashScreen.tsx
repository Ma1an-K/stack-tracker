import { PokerChipSpade } from '@/components/icons/PokerChipSpade';

/** Brand splash shown while the auth session resolves (replaces a bare spinner). */
export function SplashScreen() {
  return (
    <div className="flex min-h-[100lvh] flex-col items-center justify-center gap-4 bg-background" role="status" aria-label="Loading">
      <div className="relative flex h-16 w-16 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-gold/15 [animation-duration:1.6s]" aria-hidden="true" />
        <span className="relative flex h-16 w-16 items-center justify-center rounded-full border border-gold/40 bg-card shadow-[0_0_30px_-6px_hsl(var(--gold)/0.5)]">
          <PokerChipSpade className="h-8 w-8 text-gold" />
        </span>
      </div>
      <span className="font-display text-lg tracking-wide text-muted-foreground">Stack Tracker</span>
    </div>
  );
}

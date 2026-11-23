/** Tiny, non-blocking indicator that cached data is being refreshed. */
export function RefreshingDot({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-[0.6875rem] font-medium text-muted-foreground" role="status">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold" aria-hidden="true" />
      Updating
    </span>
  );
}

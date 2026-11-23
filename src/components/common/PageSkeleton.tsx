import { Skeleton } from '@/components/ui/skeleton';

/** Shape-matched placeholder: header + a stack of cards. */
export function PageSkeleton({ rows = 4, hero = false }: { rows?: number; hero?: boolean }) {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading">
      <div className="space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-8 w-44" />
      </div>
      {hero && <Skeleton className="h-36 w-full rounded-xl" />}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-[72px] w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

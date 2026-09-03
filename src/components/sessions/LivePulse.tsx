/** Small pulsing gold dot used wherever a live session is signposted. */
export function LivePulse({ className = '' }: { className?: string }) {
  return (
    <span className={`relative flex h-2 w-2 shrink-0 ${className}`}>
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold opacity-60" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-gold" />
    </span>
  );
}

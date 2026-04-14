import { LucideProps } from 'lucide-react';

export function PokerChipSpade({ size = 24, className, ...props }: LucideProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Outer chip circle */}
      <circle cx="12" cy="12" r="10" />
      {/* Inner chip circle */}
      <circle cx="12" cy="12" r="6" />
      {/* Chip notches */}
      <line x1="12" y1="2" x2="12" y2="4" />
      <line x1="12" y1="20" x2="12" y2="22" />
      <line x1="2" y1="12" x2="4" y2="12" />
      <line x1="20" y1="12" x2="22" y2="12" />
      <line x1="4.93" y1="4.93" x2="6.34" y2="6.34" />
      <line x1="17.66" y1="17.66" x2="19.07" y2="19.07" />
      <line x1="4.93" y1="19.07" x2="6.34" y2="17.66" />
      <line x1="17.66" y1="6.34" x2="19.07" y2="4.93" />
      {/* Spade symbol */}
      <path d="M12 7.5c-1.5 1.5-3 3-3 4.5 0 1.5 1.5 2.5 3 1.5 1.5 1 3 0 3-1.5 0-1.5-1.5-3-3-4.5z" fill="currentColor" />
      <path d="M12 14v2" />
      <path d="M10.5 16c.5-.5 1-.5 1.5 0s1 .5 1.5 0" />
    </svg>
  );
}

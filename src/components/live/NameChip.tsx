import { Check, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Large tappable name chip used for seat selection and payment pickers. */
export function NameChip({ on, onClick, children, disabled }: { on: boolean; onClick: () => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={on}
      className={cn(
        'pressable inline-flex h-11 items-center gap-1.5 rounded-full border px-4 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40',
        on ? 'gold-fill border-transparent text-primary-foreground' : 'border-border/80 bg-secondary/70 hover:border-gold/40 hover:bg-accent'
      )}
    >
      {on ? <Check className="h-4 w-4" aria-hidden="true" /> : <Plus className="h-4 w-4 text-gold" aria-hidden="true" />}
      {children}
    </button>
  );
}

import { useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface MoneyFieldProps {
  /** null shows an empty field (no amount entered yet). */
  value: number | null;
  currency: string;
  label: string;
  /** Called with the new amount, or null when the field is cleared. */
  onCommit: (value: number | null) => void;
  allowEmpty?: boolean;
  disabled?: boolean;
  className?: string;
}

const toCents = (n: number) => Math.round(n * 100) / 100;

/** An amount typed freely and committed on Enter or blur; Escape or bad input reverts. */
export function MoneyField({ value, currency, label, onCommit, allowEmpty = false, disabled = false, className }: MoneyFieldProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const activeRef = useRef(false);
  const shown = value === null ? '' : value.toFixed(2);

  const finish = (commit: boolean) => {
    if (!activeRef.current) return;
    activeRef.current = false;
    const text = (draft ?? shown).trim();
    setDraft(null);
    if (!commit) return;
    if (text === '') {
      if (allowEmpty && value !== null) onCommit(null);
      return;
    }
    const n = Number(text);
    if (!Number.isFinite(n) || n < 0) return;
    const rounded = toCents(n);
    if (value === null || rounded !== toCents(value)) onCommit(rounded);
  };

  return (
    <span className={cn('inline-flex h-11 items-center gap-1 rounded-lg border border-border/70 bg-secondary/40 px-2 focus-within:border-gold/50', className)}>
      <span aria-hidden="true" className="text-sm text-muted-foreground">{currency}</span>
      <Input
        type="number"
        inputMode="decimal"
        step="0.01"
        min="0"
        placeholder="0.00"
        aria-label={label}
        disabled={disabled}
        value={draft ?? shown}
        onFocus={e => {
          activeRef.current = true;
          setDraft(shown);
          e.currentTarget.select();
        }}
        onChange={e => setDraft(e.target.value)}
        onBlur={() => finish(true)}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            finish(true);
            e.currentTarget.blur();
          } else if (e.key === 'Escape') {
            finish(false);
            e.currentTarget.blur();
          }
        }}
        className="h-auto w-full min-w-0 border-0 bg-transparent p-0 text-right font-semibold tabular-nums focus-visible:ring-0 focus-visible:ring-offset-0 md:h-auto"
      />
    </span>
  );
}

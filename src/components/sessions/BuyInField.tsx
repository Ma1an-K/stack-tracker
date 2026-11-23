import { useRef, useState } from 'react';
import { Pencil } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface BuyInFieldProps {
  value: number;
  currency?: string;
  onCommit: (total: number) => void;
  /** Accessible name, e.g. "Buy-in total for Sam". */
  label: string;
}

const toCents = (n: number) => Math.round(n * 100) / 100;

/** Inline editable buy-in total. Commits on Enter/blur, reverts on Escape or invalid input. */
export function BuyInField({ value, currency = '$', onCommit, label }: BuyInFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  // Synchronous guard: Enter/Escape call blur(), whose handler must not commit a second time.
  const activeRef = useRef(false);

  const finish = (commit: boolean) => {
    if (!activeRef.current) return;
    activeRef.current = false;
    setEditing(false);
    if (!commit) return;
    const n = Number(draft);
    if (draft.trim() === '' || !Number.isFinite(n) || n < 0) return;
    const rounded = toCents(n);
    if (rounded !== toCents(value)) onCommit(rounded);
  };

  return (
    <span className="-mr-1 inline-flex min-h-[44px] items-center gap-1 rounded-lg px-2 text-lg font-semibold tabular-nums text-gold transition-colors duration-150 focus-within:bg-gold/10 hover:bg-gold/10">
      <span aria-hidden="true">{currency}</span>
      <Input
        type="number"
        inputMode="decimal"
        step="0.01"
        min="0"
        aria-label={label}
        value={editing ? draft : value.toFixed(2)}
        onFocus={(e) => {
          activeRef.current = true;
          setDraft(value.toFixed(2));
          setEditing(true);
          e.currentTarget.select();
        }}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => finish(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            finish(true);
            e.currentTarget.blur();
          } else if (e.key === 'Escape') {
            finish(false);
            e.currentTarget.blur();
          }
        }}
        className="h-auto w-24 rounded-md border-0 bg-transparent p-0 text-right text-lg font-semibold tabular-nums text-gold focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-0 md:h-auto md:text-lg"
      />
      <Pencil aria-hidden="true" className="h-3.5 w-3.5 text-gold opacity-60" />
    </span>
  );
}

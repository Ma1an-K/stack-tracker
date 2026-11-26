import { useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/** A player's name, renamed in place. Commits on Enter or blur; Escape reverts. */
export function NameField({
  value,
  label,
  onCommit,
  className,
}: {
  value: string;
  label: string;
  onCommit: (name: string) => void;
  className?: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const activeRef = useRef(false);

  const finish = (commit: boolean) => {
    if (!activeRef.current) return;
    activeRef.current = false;
    const next = draft ?? value;
    setDraft(null);
    if (commit && next.trim() !== value) onCommit(next);
  };

  return (
    <Input
      aria-label={label}
      value={draft ?? value}
      maxLength={60}
      onFocus={() => {
        activeRef.current = true;
        setDraft(value);
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
      className={cn(
        'h-11 min-w-0 flex-1 border-transparent bg-transparent px-1 font-medium hover:border-border/60 focus-visible:border-gold/50',
        className
      )}
    />
  );
}

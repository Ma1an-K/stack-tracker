import { useId } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TipProps {
  title?: string;
  children: string;
  onDismiss: () => void;
  /**
   * 'new-button' floats the tip beside the New (+) button: above the tab bar
   * on phones, next to the sidebar button on desktop. Default sits in the page.
   */
  anchor?: 'new-button';
  className?: string;
}

/** A small one-time hint. Dismissing it is the caller's markSeen. */
export function Tip({ title, children, onDismiss, anchor, className }: TipProps) {
  const titleId = useId();
  const floating = anchor === 'new-button';

  const tip = (
    <div
      role="note"
      aria-labelledby={title ? titleId : undefined}
      className={cn(
        'rounded-xl border border-gold/45 bg-popover px-4 py-3.5 text-popover-foreground shadow-[0_20px_40px_-12px_#000] animate-in fade-in slide-in-from-bottom-1 duration-200',
        floating && [
          'fixed z-[60] w-[min(250px,calc(100vw-2rem))]',
          // Phone: centred above the raised + in the tab bar.
          'bottom-[calc(var(--tabbar-h)+env(safe-area-inset-bottom)+2.25rem)] left-1/2 -translate-x-1/2',
          // Desktop: to the right of the sidebar's New button.
          'md:bottom-auto md:left-[15.75rem] md:top-[calc(3.5rem+env(safe-area-inset-top)+0.5rem)] md:translate-x-0',
        ],
        className
      )}
    >
      {floating && (
        <span
          aria-hidden="true"
          className={cn(
            'absolute h-3 w-3 rotate-45 bg-popover',
            '-bottom-[7px] left-1/2 -translate-x-1/2 border-b border-r border-gold/45',
            'md:bottom-auto md:-left-[7px] md:top-5 md:translate-x-0 md:border-b md:border-l md:border-r-0'
          )}
        />
      )}
      {title && (
        <p id={titleId} className="mb-1 text-sm font-semibold">
          {title}
        </p>
      )}
      <p className="mb-2.5 text-[0.8125rem] text-muted-foreground">{children}</p>
      <Button size="sm" className="h-11 px-4" onClick={onDismiss}>
        Got it
      </Button>
    </div>
  );

  // Fixed positioning breaks inside the animated page wrapper, so float from body.
  return floating ? createPortal(tip, document.body) : tip;
}

import { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('surface flex flex-col items-center px-6 py-10 text-center', className)}>
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-gold/30 bg-gold/10 shadow-[0_0_24px_-6px_hsl(var(--gold)/0.45)]">
        <Icon className="h-6 w-6 text-gold" aria-hidden="true" />
      </div>
      <h2 className="font-display text-2xl font-semibold text-foreground">{title}</h2>
      {description && <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

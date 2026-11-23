import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: ReactNode;
  eyebrow?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
}

/** One page header for every screen: gold eyebrow, serif title, optional action. */
export function PageHeader({ title, eyebrow, subtitle, action, className }: PageHeaderProps) {
  return (
    <header className={cn('flex items-end justify-between gap-3', className)}>
      <div className="min-w-0">
        {eyebrow && <p className="section-header mb-1">{eyebrow}</p>}
        <h1 className="page-title truncate">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}

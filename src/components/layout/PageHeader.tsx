import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  leftSlot?: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, leftSlot, actions }: PageHeaderProps) {
  return (
    <div className="flex items-center gap-3 border-b border-border px-3 py-3 sm:px-4 sm:py-4">
      {leftSlot}

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-lg font-semibold sm:text-xl">{title}</h1>
        {subtitle ? (
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>

      {actions ? <div className="flex items-center gap-1 sm:gap-2">{actions}</div> : null}
    </div>
  );
}
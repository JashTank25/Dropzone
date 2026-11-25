import * as React from 'react';
import { cn } from '@/src/utils/cn';

interface AppHeaderProps {
  left: React.ReactNode;
  center?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}

export function AppHeader({ left, center, right, className }: AppHeaderProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex h-14 w-full items-center justify-between gap-4 border-b border-border bg-surface/95 px-4 backdrop-blur-sm sm:px-6',
        className
      )}
    >
      <div className="flex min-w-0 items-center gap-3 shrink-0">{left}</div>
      {center && <div className="hidden md:flex items-center gap-6">{center}</div>}
      {right && <div className="flex items-center gap-2 shrink-0">{right}</div>}
    </header>
  );
}

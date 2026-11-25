import * as React from 'react';
import { cn } from '@/src/utils/cn';

interface AppSidebarProps {
  side?: 'left' | 'right';
  children: React.ReactNode;
  className?: string;
}

export function AppSidebar({ side = 'left', children, className }: AppSidebarProps) {
  return (
    <aside
      className={cn(
        'hidden lg:flex h-[calc(100vh-3.5rem)] shrink-0 flex-col bg-surface',
        side === 'left' ? 'w-72 border-r border-border' : 'w-80 border-l border-border',
        className
      )}
    >
      {children}
    </aside>
  );
}

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cn } from '@/src/utils/cn';

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

interface SheetContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  side?: 'bottom' | 'right' | 'left';
}

export function SheetContent({
  side = 'bottom',
  className,
  children,
  ...props
}: SheetContentProps) {
  const positionClasses =
    side === 'bottom'
      ? 'inset-x-0 bottom-0 max-h-[88vh] rounded-t-2xl border-t pb-safe'
      : side === 'right'
        ? 'inset-y-0 right-0 h-full w-full max-w-md border-l'
        : 'inset-y-0 left-0 h-full w-full max-w-md border-r';

  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-[2px]" />
      <DialogPrimitive.Content
        className={cn(
          'fixed z-50 flex flex-col border-border bg-surface p-5 text-foreground shadow-xl focus:outline-none',
          positionClasses,
          className
        )}
        {...props}
      >
        {side === 'bottom' && (
          <div className="mx-auto mb-3 h-1.5 w-10 shrink-0 rounded-full bg-border" aria-hidden="true" />
        )}
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mb-3 flex flex-col gap-1', className)} {...props} />;
}

export function SheetTitle({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title className={cn('text-base font-semibold text-foreground', className)} {...props} />
  );
}

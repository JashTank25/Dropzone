import { useEffect, useState } from 'react';
import { ClockIcon } from '@/src/components/common/StreamlineIcons';
import { formatCountdown } from '@/src/utils/format';
import { cn } from '@/src/utils/cn';

interface RoomExpirationTimerProps {
  expiresAt: string;
  onExpired?: () => void;
}

export function RoomExpirationTimer({ expiresAt, onExpired }: RoomExpirationTimerProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (new Date(expiresAt).getTime() <= current && onExpired) {
        onExpired();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, onExpired]);

  const { label, isExpiringSoon, isExpired } = formatCountdown(expiresAt, now);

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 font-mono text-xs font-medium tabular-nums whitespace-nowrap shrink-0',
        isExpired ? 'text-destructive' : isExpiringSoon ? 'text-warning' : 'text-muted-foreground'
      )}
      title={`Expires at ${new Date(expiresAt).toLocaleString()}`}
    >
      <ClockIcon size={14} />
      <span>{isExpired ? 'Expired' : label}</span>
    </div>
  );
}

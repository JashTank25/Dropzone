import type { RealtimeConnectionState } from '@/src/stores/useRoomStore';
import { useOnlineStatus } from '@/src/hooks/useOnlineStatus';
import { cn } from '@/src/utils/cn';

export function ConnectionStatus({ status }: { status: RealtimeConnectionState }) {
  const isOnline = useOnlineStatus();

  const resolvedState = !isOnline ? 'offline' : status;

  const config: Record<string, { label: string; dotClass: string; textClass: string }> = {
    connected: {
      label: 'Live',
      dotClass: 'bg-success',
      textClass: 'text-success',
    },
    connecting: {
      label: 'Connecting',
      dotClass: 'bg-warning',
      textClass: 'text-warning',
    },
    reconnecting: {
      label: 'Reconnecting',
      dotClass: 'bg-warning',
      textClass: 'text-warning',
    },
    disconnected: {
      label: 'Disconnected',
      dotClass: 'bg-destructive',
      textClass: 'text-destructive',
    },
    offline: {
      label: 'Offline',
      dotClass: 'bg-destructive',
      textClass: 'text-destructive',
    },
  };

  const current = config[resolvedState];

  return (
    <div
      className={cn('inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap shrink-0', current.textClass)}
      title={`Realtime connection: ${current.label}`}
    >
      <span className={cn('h-2 w-2 rounded-full', current.dotClass)} aria-hidden="true" />
      <span>{current.label}</span>
    </div>
  );
}

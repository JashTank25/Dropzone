import { Button } from '@/src/components/ui/button';
import {
  AlertIcon,
  ClockIcon,
  LockIcon,
  RefreshIcon,
  ShieldIcon,
  WifiOffIcon,
} from '@/src/components/common/StreamlineIcons';
import type { RoomTerminalError } from '@/src/types';

interface RoomStatusScreenProps {
  error: Exclude<RoomTerminalError, null>;
  onGoHome: () => void;
  onRetry?: () => void;
}

export function RoomStatusScreen({ error, onGoHome, onRetry }: RoomStatusScreenProps) {
  if (error.type === 'pending_approval') {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <div className="w-full max-w-md rounded-xl border border-border bg-surface p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ShieldIcon size={24} />
          </div>
          <h1 className="text-lg font-semibold text-foreground">Waiting for Host Approval</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your request to join <span className="font-medium text-foreground">{error.roomName}</span> has been sent. You will enter the room automatically once the host approves this device.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Button variant="outline" onClick={onGoHome}>
              Cancel & Leave
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const meta: Record<
    Exclude<Exclude<RoomTerminalError, null>['type'], 'pending_approval'>,
    { title: string; icon: React.ReactNode; tone: string }
  > = {
    expired: {
      title: 'Room Expired',
      icon: <ClockIcon size={24} />,
      tone: 'bg-warning-subtle text-warning',
    },
    ended: {
      title: 'Room Ended',
      icon: <LockIcon size={24} />,
      tone: 'bg-surface-subtle text-muted-foreground',
    },
    not_found: {
      title: 'Room Not Found',
      icon: <AlertIcon size={24} />,
      tone: 'bg-destructive-subtle text-destructive',
    },
    locked: {
      title: 'Room Locked',
      icon: <LockIcon size={24} />,
      tone: 'bg-warning-subtle text-warning',
    },
    rejected: {
      title: 'Join Request Declined',
      icon: <AlertIcon size={24} />,
      tone: 'bg-destructive-subtle text-destructive',
    },
    removed: {
      title: 'Removed From Room',
      icon: <AlertIcon size={24} />,
      tone: 'bg-destructive-subtle text-destructive',
    },
    connection_lost: {
      title: 'Connection Lost',
      icon: <WifiOffIcon size={24} />,
      tone: 'bg-warning-subtle text-warning',
    },
  };

  const current = meta[error.type];

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-8 text-center">
        <div className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${current.tone}`}>
          {current.icon}
        </div>
        <h1 className="text-lg font-semibold text-foreground">{current.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {onRetry && (
            <Button variant="outline" onClick={onRetry}>
              <RefreshIcon size={16} />
              <span>Try Again</span>
            </Button>
          )}
          <Button onClick={onGoHome}>Back to DropBridge</Button>
        </div>
      </div>
    </div>
  );
}

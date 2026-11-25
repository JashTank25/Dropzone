import { useOnlineStatus } from '@/src/hooks/useOnlineStatus';
import { WifiOffIcon } from '@/src/components/common/StreamlineIcons';

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-20 left-4 z-50 flex items-center gap-2 rounded-lg border border-warning/30 bg-warning-subtle px-3 py-2 text-xs font-medium text-warning shadow-md lg:bottom-4"
    >
      <WifiOffIcon size={15} />
      <span>Internet disconnected. Waiting to reconnect.</span>
    </div>
  );
}

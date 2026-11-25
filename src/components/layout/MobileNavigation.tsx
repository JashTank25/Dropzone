import { useUIStore, type MobileTab } from '@/src/stores/useUIStore';
import { useRoomStore } from '@/src/stores/useRoomStore';
import { useTransferStore } from '@/src/stores/useTransferStore';
import { ChatIcon, DevicesIcon, DocFileIcon, TransferIcon } from '@/src/components/common/StreamlineIcons';
import { cn } from '@/src/utils/cn';

export function MobileNavigation() {
  const mobileTab = useUIStore((s) => s.mobileTab);
  const setMobileTab = useUIStore((s) => s.setMobileTab);
  const clearUnreadMessages = useRoomStore((s) => s.clearUnreadMessages);
  const unreadCount = useRoomStore((s) => s.unreadMessagesCount);
  const activeTransfers = useTransferStore((s) =>
    s.transfers.filter((t) => t.status === 'transferring' || t.status === 'queued').length
  );
  const membersCount = useRoomStore((s) => s.members.length);

  const items: { id: MobileTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'files', label: 'Files', icon: <DocFileIcon size={20} /> },
    { id: 'transfers', label: 'Transfers', icon: <TransferIcon size={20} />, badge: activeTransfers },
    { id: 'chat', label: 'Chat', icon: <ChatIcon size={20} />, badge: unreadCount },
    { id: 'devices', label: 'Devices', icon: <DevicesIcon size={20} />, badge: membersCount },
  ];

  return (
    <nav
      aria-label="Room mobile navigation"
      className="fixed inset-x-0 bottom-0 z-40 grid h-16 grid-cols-4 border-t border-border bg-surface/95 backdrop-blur-md pb-safe lg:hidden"
    >
      {items.map((item) => {
        const isActive = mobileTab === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setMobileTab(item.id);
              if (item.id === 'chat') clearUnreadMessages();
            }}
            className={cn(
              'relative flex min-h-[44px] flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors',
              isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <div className="relative">
              {item.icon}
              {item.badge !== undefined && item.badge > 0 && (
                <span className="absolute -right-2.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground tabular-nums">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </div>
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

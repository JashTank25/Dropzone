import { Button } from '@/src/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/src/components/ui/dropdown-menu';
import {
  DesktopDeviceIcon,
  MobileDeviceIcon,
  MoreVerticalIcon,
  ShieldIcon,
  TabletDeviceIcon,
  TrashIcon,
} from '@/src/components/common/StreamlineIcons';
import { formatTimeShort } from '@/src/utils/format';
import type { RoomMember } from '@/src/types';

interface ConnectedDeviceCardProps {
  member: RoomMember;
  isOnline: boolean;
  isCurrentDevice: boolean;
  viewerIsHost: boolean;
  onRemoveDevice: (member: RoomMember) => void;
  onTransferHost: (member: RoomMember) => void;
}

export function ConnectedDeviceCard({
  member,
  isOnline,
  isCurrentDevice,
  viewerIsHost,
  onRemoveDevice,
  onTransferHost,
}: ConnectedDeviceCardProps) {
  const DeviceIcon =
    member.device_type === 'mobile'
      ? MobileDeviceIcon
      : member.device_type === 'tablet'
        ? TabletDeviceIcon
        : DesktopDeviceIcon;

  const canManage = viewerIsHost && !isCurrentDevice && member.role !== 'host';

  return (
    <div className="flex items-start justify-between gap-2.5 rounded-lg border border-border bg-background p-3">
      <div className="flex min-w-0 items-start gap-2.5">
        <div className="relative mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-subtle text-foreground">
          <DeviceIcon size={17} />
          <span
            title={isOnline ? 'Online' : 'Offline'}
            className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background ${
              isOnline ? 'bg-success' : 'bg-muted-foreground/50'
            }`}
          />
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-medium text-foreground">
              {member.display_name}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {member.operating_system} · {member.browser}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">
            {member.role === 'host' ? 'Host' : 'Guest'}
            {isCurrentDevice ? ' · This device' : ''} · {isOnline ? 'Online' : 'Offline'} · {formatTimeShort(member.joined_at)}
          </p>
        </div>
      </div>

      {canManage && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={`Manage ${member.display_name}`}>
              <MoreVerticalIcon size={15} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => onTransferHost(member)}>
              <ShieldIcon size={15} />
              <span>Make Host</span>
            </DropdownMenuItem>
            <DropdownMenuItem destructive onClick={() => onRemoveDevice(member)}>
              <TrashIcon size={15} />
              <span>Remove Device</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

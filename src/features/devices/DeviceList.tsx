import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/src/components/ui/button';
import { ConfirmDialog } from '@/src/components/common/ConfirmDialog';
import { CheckIcon, CloseIcon } from '@/src/components/common/StreamlineIcons';
import { ConnectedDeviceCard } from '@/src/features/devices/ConnectedDeviceCard';
import {
  removeRoomMember,
  reviewJoinRequest,
  transferHostOwnership,
} from '@/src/services/roomService';
import { useRoomStore } from '@/src/stores/useRoomStore';
import type { RoomMember } from '@/src/types';

export function DeviceList() {
  const room = useRoomStore((s) => s.room);
  const currentMember = useRoomStore((s) => s.currentMember);
  const members = useRoomStore((s) => s.members);
  const onlineIds = useRoomStore((s) => s.onlineMemberIds);
  const joinRequests = useRoomStore((s) => s.joinRequests);

  const [removeTarget, setRemoveTarget] = useState<RoomMember | null>(null);
  const [transferTarget, setTransferTarget] = useState<RoomMember | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  if (!room || !currentMember) return null;

  const isHost = currentMember.role === 'host';
  const activeMembers = members.filter((m) => m.membership_status === 'active');
  const pendingRequests = joinRequests.filter((r) => r.request_status === 'pending');

  const handleReview = async (requestId: string, decision: 'approved' | 'rejected') => {
    try {
      await reviewJoinRequest(room.id, requestId, decision);
      toast.success(decision === 'approved' ? 'Device approved' : 'Request declined');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to review request');
    }
  };

  const handleRemove = async () => {
    if (!removeTarget) return;
    setIsBusy(true);
    try {
      await removeRoomMember(room.id, removeTarget.id);
      toast.success(`${removeTarget.display_name} removed`);
      setRemoveTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to remove device');
    } finally {
      setIsBusy(false);
    }
  };

  const handleTransferHost = async () => {
    if (!transferTarget) return;
    setIsBusy(true);
    try {
      await transferHostOwnership(room.id, transferTarget.id);
      toast.success(`${transferTarget.display_name} is now room host`);
      setTransferTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to transfer host');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {isHost && pendingRequests.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-warning">
            Pending Approval ({pendingRequests.length})
          </h3>
          <div className="space-y-2">
            {pendingRequests.map((req) => (
              <div
                key={req.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-warning/30 bg-warning-subtle p-2.5 text-xs"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{req.device_name}</p>
                  <p className="text-muted-foreground">
                    {req.operating_system} · {req.browser}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    size="icon-sm"
                    variant="outline"
                    onClick={() => void handleReview(req.id, 'approved')}
                    aria-label="Approve join request"
                  >
                    <CheckIcon size={14} className="text-success" />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="outline"
                    onClick={() => void handleReview(req.id, 'rejected')}
                    aria-label="Reject join request"
                  >
                    <CloseIcon size={14} className="text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <h3 className="font-semibold text-muted-foreground">
            Connected Devices ({activeMembers.length}/{room.max_devices})
          </h3>
        </div>
        <div className="space-y-2">
          {activeMembers.map((member) => (
            <ConnectedDeviceCard
              key={member.id}
              member={member}
              isOnline={onlineIds.includes(member.id) || member.id === currentMember.id}
              isCurrentDevice={member.id === currentMember.id}
              viewerIsHost={isHost}
              onRemoveDevice={setRemoveTarget}
              onTransferHost={setTransferTarget}
            />
          ))}
        </div>
      </div>

      <ConfirmDialog
        open={!!removeTarget}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
        title="Remove Device"
        description={`Remove ${removeTarget?.display_name || 'this device'} from the room? They will lose access to shared files immediately.`}
        confirmLabel="Remove Device"
        destructive
        isLoading={isBusy}
        onConfirm={handleRemove}
      />

      <ConfirmDialog
        open={!!transferTarget}
        onOpenChange={(open) => !open && setTransferTarget(null)}
        title="Transfer Host Ownership"
        description={`Make ${transferTarget?.display_name || 'this device'} the room host? You will become a regular member.`}
        confirmLabel="Transfer Host"
        isLoading={isBusy}
        onConfirm={handleTransferHost}
      />
    </div>
  );
}

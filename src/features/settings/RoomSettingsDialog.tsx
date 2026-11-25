import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/src/components/ui/dialog';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Switch } from '@/src/components/ui/switch';
import { ConfirmDialog } from '@/src/components/common/ConfirmDialog';
import { endRoom, updateRoomSettings } from '@/src/services/roomService';
import { useRoomStore } from '@/src/stores/useRoomStore';

interface RoomSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RoomSettingsDialog({ open, onOpenChange }: RoomSettingsDialogProps) {
  const room = useRoomStore((s) => s.room);
  const currentMember = useRoomStore((s) => s.currentMember);

  const [roomName, setRoomName] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const [requireApproval, setRequireApproval] = useState(false);
  const [allowChat, setAllowChat] = useState(true);
  const [allowUpload, setAllowUpload] = useState(true);
  const [allowDownload, setAllowDownload] = useState(true);
  const [autoDeleteFiles, setAutoDeleteFiles] = useState(true);
  const [maxDevices, setMaxDevices] = useState(25);
  const [newPassword, setNewPassword] = useState('');
  const [clearPassword, setClearPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmEndOpen, setConfirmEndOpen] = useState(false);

  useEffect(() => {
    if (room && open) {
      setRoomName(room.room_name);
      setIsLocked(room.is_locked);
      setRequireApproval(room.require_approval);
      setAllowChat(room.allow_chat);
      setAllowUpload(room.allow_upload);
      setAllowDownload(room.allow_download);
      setAutoDeleteFiles(room.auto_delete_files);
      setMaxDevices(room.max_devices);
      setNewPassword('');
      setClearPassword(false);
    }
  }, [room, open]);

  if (!room || !currentMember) return null;
  const isHost = currentMember.role === 'host';

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateRoomSettings(room.id, {
        roomName,
        isLocked,
        requireApproval,
        allowChat,
        allowUpload,
        allowDownload,
        autoDeleteFiles,
        maxDevices,
        newPassword: newPassword || undefined,
        clearPassword,
      });
      toast.success('Room settings updated');
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleExtend = async (minutes: number) => {
    try {
      await updateRoomSettings(room.id, { extendMinutes: minutes });
      toast.success(`Room extended by ${minutes >= 60 ? `${minutes / 60}h` : `${minutes}m`}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to extend room');
    }
  };

  const handleEndRoom = async () => {
    setSaving(true);
    try {
      await endRoom(room.id);
      setConfirmEndOpen(false);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to end room');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Room Settings</DialogTitle>
            <DialogDescription>
              {isHost
                ? 'Configure access controls, permissions, and room lifetime.'
                : 'Only the room host can modify these settings.'}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="settings-room-name">Room Name</Label>
              <Input
                id="settings-room-name"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                disabled={!isHost}
                maxLength={80}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="settings-max-devices">Max Devices (2–100)</Label>
                <Input
                  id="settings-max-devices"
                  type="number"
                  min={2}
                  max={100}
                  value={maxDevices}
                  onChange={(e) => setMaxDevices(Number(e.target.value) || 25)}
                  disabled={!isHost}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="settings-password">
                  {room.has_password ? 'Change Password' : 'Set Optional Password'}
                </Label>
                <Input
                  id="settings-password"
                  type="password"
                  placeholder={room.has_password ? 'Leave blank to keep' : 'Optional'}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (e.target.value) setClearPassword(false);
                  }}
                  disabled={!isHost}
                />
              </div>
            </div>

            {room.has_password && isHost && (
              <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                <span className="text-xs text-muted-foreground">Remove existing room password</span>
                <Switch checked={clearPassword} onCheckedChange={setClearPassword} />
              </div>
            )}

            <div className="divide-y divide-border rounded-xl border border-border px-4">
              {[
                { label: 'Lock Room', desc: 'Prevent new devices from joining', value: isLocked, set: setIsLocked },
                { label: 'Require Host Approval', desc: 'Approve each new device manually', value: requireApproval, set: setRequireApproval },
                { label: 'Allow Guest Uploads', desc: 'Members can upload and share files', value: allowUpload, set: setAllowUpload },
                { label: 'Allow File Downloads', desc: 'Members can download shared files', value: allowDownload, set: setAllowDownload },
                { label: 'Allow Chat', desc: 'Enable room text and link chat', value: allowChat, set: setAllowChat },
                { label: 'Auto-Clear on Expiration', desc: 'Purge session file references when room ends', value: autoDeleteFiles, set: setAutoDeleteFiles },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <Switch checked={item.value} onCheckedChange={item.set} disabled={!isHost} />
                </div>
              ))}
            </div>

            {isHost && (
              <div className="space-y-2 rounded-xl border border-border p-4">
                <p className="text-xs font-semibold text-foreground">Extend Room Duration</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: '+15 min', mins: 15 },
                    { label: '+30 min', mins: 30 },
                    { label: '+1 hour', mins: 60 },
                    { label: '+6 hours', mins: 360 },
                  ].map((opt) => (
                    <Button
                      key={opt.mins}
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void handleExtend(opt.mins)}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="sm:justify-between">
            {isHost ? (
              <Button
                type="button"
                variant="destructive"
                onClick={() => setConfirmEndOpen(true)}
              >
                End Room for All
              </Button>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              {isHost && (
                <Button type="button" disabled={saving} onClick={() => void handleSave()}>
                  {saving ? 'Saving...' : 'Save Settings'}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmEndOpen}
        onOpenChange={setConfirmEndOpen}
        title="End Room for Everyone?"
        description="All connected devices will be disconnected immediately and all shared files will be marked for deletion."
        confirmLabel="End Room"
        destructive
        isLoading={saving}
        onConfirm={handleEndRoom}
      />
    </>
  );
}

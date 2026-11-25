import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/src/components/ui/dialog';
import { Button } from '@/src/components/ui/button';
import { formatBytes } from '@/src/utils/format';
import type { RoomMember, SharedFile } from '@/src/types';

interface FileDetailsDialogProps {
  file: SharedFile | null;
  sender?: RoomMember;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FileDetailsDialog({ file, sender, open, onOpenChange }: FileDetailsDialogProps) {
  if (!file) return null;

  const rows: { label: string; value: string; mono?: boolean }[] = [
    { label: 'File Name', value: file.original_file_name },
    { label: 'File Size', value: `${formatBytes(file.file_size)} (${file.file_size.toLocaleString()} bytes)`, mono: true },
    { label: 'MIME Type', value: file.mime_type || 'application/octet-stream', mono: true },
    { label: 'Extension', value: file.file_extension ? `.${file.file_extension}` : 'None', mono: true },
    { label: 'Transfer Mode', value: file.transfer_mode === 'webrtc' ? 'Direct Transfer (WebRTC)' : 'Cloud Relay (Private Storage)' },
    { label: 'Shared By', value: sender ? `${sender.display_name} (${sender.operating_system} · ${sender.browser})` : 'Room Member' },
    { label: 'Shared At', value: new Date(file.created_at).toLocaleString(), mono: true },
    { label: 'Expires At', value: new Date(file.expires_at).toLocaleString(), mono: true },
    { label: 'SHA-256 Checksum', value: file.checksum || 'Not computed for large stream', mono: true },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>File Details</DialogTitle>
          <DialogDescription>Metadata and transfer details for this shared item.</DialogDescription>
        </DialogHeader>

        <dl className="mt-4 divide-y divide-border text-sm">
          {rows.map((row) => (
            <div key={row.label} className="grid grid-cols-3 gap-3 py-2.5">
              <dt className="text-xs font-medium text-muted-foreground">{row.label}</dt>
              <dd
                className={`col-span-2 break-all text-xs text-foreground ${row.mono ? 'font-mono tabular-nums' : ''}`}
              >
                {row.value}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-5 flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

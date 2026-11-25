import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/src/components/ui/dialog';
import { Button } from '@/src/components/ui/button';
import { CheckIcon, CopyIcon, ShareIcon } from '@/src/components/common/StreamlineIcons';

interface QRCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomCode: string;
  roomName: string;
}

export function QRCodeDialog({ open, onOpenChange, roomCode, roomName }: QRCodeDialogProps) {
  const [copied, setCopied] = useState(false);
  const inviteUrl = `${window.location.origin}/?code=${roomCode}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      toast.success('Invitation link copied');
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error('Unable to copy link');
    }
  };

  const shareInvite = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `DropBridge — ${roomName}`,
          text: `Join DropBridge room ${roomCode}`,
          url: inviteUrl,
        });
        return;
      } catch {
        // Fallback to copy
      }
    }
    await copyLink();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm text-center">
        <DialogHeader className="text-center">
          <DialogTitle>Invite Devices</DialogTitle>
          <DialogDescription>
            Scan this QR code with a phone camera or enter room code <strong className="font-mono text-foreground">{roomCode}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="my-5 flex flex-col items-center justify-center rounded-xl border border-border bg-surface p-5">
          <QRCodeSVG
            value={inviteUrl}
            size={200}
            level="M"
            bgColor="#FFFFFF"
            fgColor="#0F172A"
            includeMargin={false}
          />
          <p className="mt-4 font-mono text-lg font-semibold tracking-[0.18em] text-foreground tabular-nums">
            {roomCode}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => void copyLink()}>
            {copied ? <CheckIcon size={16} className="text-success" /> : <CopyIcon size={16} />}
            <span>{copied ? 'Copied' : 'Copy Link'}</span>
          </Button>
          <Button onClick={() => void shareInvite()}>
            <ShareIcon size={16} />
            <span>Share</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

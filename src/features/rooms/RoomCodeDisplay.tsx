import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/src/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/src/components/ui/tooltip';
import { CheckIcon, CopyIcon, QrCodeIcon, ShareIcon } from '@/src/components/common/StreamlineIcons';

interface RoomCodeDisplayProps {
  roomCode: string;
  onOpenQR: () => void;
  compact?: boolean;
}

export function RoomCodeDisplay({ roomCode, onOpenQR, compact = false }: RoomCodeDisplayProps) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const inviteUrl = `${window.location.origin}/?code=${roomCode}`;

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopiedCode(true);
      toast.success('Room code copied');
      setTimeout(() => setCopiedCode(false), 1800);
    } catch {
      toast.error('Clipboard access denied');
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedLink(true);
      toast.success('Invitation link copied');
      setTimeout(() => setCopiedLink(false), 1800);
    } catch {
      toast.error('Clipboard access denied');
    }
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join DropBridge Room',
          text: `Join my DropBridge file-sharing room with code ${roomCode}`,
          url: inviteUrl,
        });
        return;
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
      }
    }
    await copyLink();
  };

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => void copyCode()}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-subtle px-2.5 py-1 font-mono text-sm font-semibold tracking-wider text-foreground tabular-nums hover:bg-border/60 transition-colors"
          title="Copy room code"
        >
          <span>{roomCode}</span>
          {copiedCode ? <CheckIcon size={14} className="text-success" /> : <CopyIcon size={14} className="text-muted-foreground" />}
        </button>
        <Button variant="ghost" size="icon-sm" onClick={onOpenQR} aria-label="Show QR code">
          <QrCodeIcon size={16} />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2">
        <div>
          <span className="block text-[11px] font-medium text-muted-foreground">Room Code</span>
          <span className="font-mono text-xl font-semibold tracking-[0.14em] text-foreground tabular-nums">
            {roomCode}
          </span>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon-sm" onClick={() => void copyCode()} aria-label="Copy room code">
                {copiedCode ? <CheckIcon size={16} className="text-success" /> : <CopyIcon size={16} />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Copy 6-digit code</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        <Button variant="outline" size="sm" onClick={() => void copyLink()} className="px-2">
          {copiedLink ? <CheckIcon size={14} className="text-success" /> : <CopyIcon size={14} />}
          <span>Link</span>
        </Button>
        <Button variant="outline" size="sm" onClick={onOpenQR} className="px-2">
          <QrCodeIcon size={14} />
          <span>QR</span>
        </Button>
        <Button variant="outline" size="sm" onClick={() => void shareNative()} className="px-2">
          <ShareIcon size={14} />
          <span>Share</span>
        </Button>
      </div>
    </div>
  );
}

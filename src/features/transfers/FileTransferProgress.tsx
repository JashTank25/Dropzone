import { Button } from '@/src/components/ui/button';
import { Progress } from '@/src/components/ui/progress';
import { CloseIcon, RefreshIcon } from '@/src/components/common/StreamlineIcons';
import { formatBytes, formatEta, formatSpeed } from '@/src/utils/format';
import type { TransferItem } from '@/src/types';

interface FileTransferProgressProps {
  transfer: TransferItem;
  onCancel: (id: string) => void;
  onRetry: (transfer: TransferItem) => void;
  onDismiss: (id: string) => void;
}

export function FileTransferProgress({
  transfer,
  onCancel,
  onRetry,
  onDismiss,
}: FileTransferProgressProps) {
  const isActive = transfer.status === 'transferring' || transfer.status === 'queued';
  const isFailed = transfer.status === 'failed';
  const isCompleted = transfer.status === 'completed';

  return (
    <div className="rounded-lg border border-border bg-surface p-3 text-xs">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-foreground">{transfer.fileName}</p>
          <p className="mt-0.5 text-muted-foreground tabular-nums">
            {transfer.direction === 'upload' ? 'Uploading' : 'Downloading'} ·{' '}
            {transfer.mode === 'webrtc' ? 'Direct (P2P)' : 'Cloud Relay'} ·{' '}
            {formatBytes(transfer.bytesTransferred)} / {formatBytes(transfer.fileSize)}
          </p>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {isActive && (
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => onCancel(transfer.id)}
              aria-label="Cancel transfer"
              title="Cancel"
            >
              <CloseIcon size={14} />
            </Button>
          )}
          {isFailed && transfer.retryFile && (
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => onRetry(transfer)}
              aria-label="Retry transfer"
              title="Retry"
            >
              <RefreshIcon size={14} />
            </Button>
          )}
          {!isActive && (
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => onDismiss(transfer.id)}
              aria-label="Dismiss"
              title="Dismiss"
            >
              <CloseIcon size={14} />
            </Button>
          )}
        </div>
      </div>

      <div className="mt-2">
        <Progress
          value={transfer.progress}
          indicatorClassName={
            isFailed ? 'bg-destructive' : isCompleted ? 'bg-success' : 'bg-primary'
          }
        />
      </div>

      <div className="mt-1.5 flex items-center justify-between font-mono text-[11px] tabular-nums">
        {isActive && (
          <>
            <span className="text-muted-foreground">
              {formatSpeed(transfer.speedBytesPerSec)} · {formatEta(transfer.etaSeconds)}
            </span>
            <span className="font-semibold text-foreground">{transfer.progress}%</span>
          </>
        )}
        {isCompleted && (
          <>
            <span className="text-success font-sans font-medium">Completed</span>
            <span className="text-success font-semibold">100%</span>
          </>
        )}
        {isFailed && (
          <span className="text-destructive font-sans">
            {transfer.errorMessage || 'Transfer failed'}
          </span>
        )}
        {transfer.status === 'cancelled' && (
          <span className="text-muted-foreground font-sans">Cancelled</span>
        )}
      </div>
    </div>
  );
}

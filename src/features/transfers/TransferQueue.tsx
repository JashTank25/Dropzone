import { Button } from '@/src/components/ui/button';
import { EmptyState } from '@/src/components/common/EmptyState';
import { TransferIcon } from '@/src/components/common/StreamlineIcons';
import { FileTransferProgress } from '@/src/features/transfers/FileTransferProgress';
import { useTransferStore } from '@/src/stores/useTransferStore';
import type { TransferItem } from '@/src/types';

interface TransferQueueProps {
  onRetryUpload: (transfer: TransferItem) => void;
  showEmpty?: boolean;
}

export function TransferQueue({ onRetryUpload, showEmpty = false }: TransferQueueProps) {
  const transfers = useTransferStore((s) => s.transfers);
  const cancelTransfer = useTransferStore((s) => s.cancelTransfer);
  const removeTransfer = useTransferStore((s) => s.removeTransfer);
  const clearFinishedTransfers = useTransferStore((s) => s.clearFinishedTransfers);

  if (transfers.length === 0) {
    if (!showEmpty) return null;
    return (
      <EmptyState
        icon={<TransferIcon size={22} />}
        title="No active transfers"
        description="Uploads and downloads appear here with live progress, speed, and remaining time."
      />
    );
  }

  const hasFinished = transfers.some((t) => t.status === 'completed' || t.status === 'failed' || t.status === 'cancelled');

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-muted-foreground">
          Transfers ({transfers.length})
        </h3>
        {hasFinished && (
          <Button variant="ghost" size="sm" onClick={clearFinishedTransfers} className="h-7 px-2 text-xs">
            Clear finished
          </Button>
        )}
      </div>
      <div className="space-y-2">
        {transfers.map((t) => (
          <FileTransferProgress
            key={t.id}
            transfer={t}
            onCancel={cancelTransfer}
            onRetry={onRetryUpload}
            onDismiss={removeTransfer}
          />
        ))}
      </div>
    </div>
  );
}

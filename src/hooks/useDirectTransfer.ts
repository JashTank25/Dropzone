import { useCallback, type MutableRefObject } from 'react';
import { toast } from 'sonner';
import type { DirectTransferManager } from '@/src/lib/webrtc/DirectTransferManager';
import { shareFileInSession } from '@/src/services/fileService';
import {
  registerTransferCancelHandler,
  unregisterTransferCancelHandler,
  useTransferStore,
} from '@/src/stores/useTransferStore';

export function useDirectTransfer(
  directManagerRef: MutableRefObject<DirectTransferManager | null>,
  roomId: string | null,
  memberId: string | null
) {
  const sendDirectOrFallback = useCallback(
    async (file: File, targetPeerMemberId: string, peerName: string) => {
      if (!roomId || !memberId) return;
      const manager = directManagerRef.current;
      if (!manager) {
        toast.info('Direct peer channel unavailable. Switching to Live Session Relay.');
        await shareFileInSession({ roomId, file, transferMode: 'cloud' });
        return;
      }

      const transferId = crypto.randomUUID();
      const fileId = crypto.randomUUID();

      useTransferStore.getState().upsertTransfer({
        id: transferId,
        fileId,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || 'application/octet-stream',
        direction: 'upload',
        mode: 'webrtc',
        status: 'transferring',
        bytesTransferred: 0,
        progress: 0,
        speedBytesPerSec: 0,
        etaSeconds: null,
        peerName,
        startedAt: Date.now(),
        retryFile: file,
      });

      registerTransferCancelHandler(transferId, () => {
        manager.cancelOutgoing(transferId);
      });

      try {
        await manager.sendFileToPeer(
          targetPeerMemberId,
          file,
          transferId,
          fileId,
          (bytesSent, speedBps, etaSeconds) => {
            useTransferStore.getState().updateTransfer(transferId, {
              bytesTransferred: bytesSent,
              progress: file.size > 0 ? Math.min(100, Math.round((bytesSent / file.size) * 100)) : 100,
              speedBytesPerSec: speedBps,
              etaSeconds,
            });
          }
        );

        useTransferStore.getState().updateTransfer(transferId, {
          status: 'completed',
          progress: 100,
          bytesTransferred: file.size,
          speedBytesPerSec: 0,
          etaSeconds: 0,
        });
        toast.success(`Sent ${file.name} directly to ${peerName}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Direct transfer failed';
        const isCancelled = message.toLowerCase().includes('cancel');

        useTransferStore.getState().updateTransfer(transferId, {
          status: isCancelled ? 'cancelled' : 'failed',
          errorMessage: isCancelled ? undefined : message,
          speedBytesPerSec: 0,
          etaSeconds: null,
        });

        if (!isCancelled) {
          toast.warning(`Direct P2P failed (${message}). Sharing via Live Session Relay...`);
          await shareFileInSession({ roomId, file, transferMode: 'cloud' });
        }
      } finally {
        unregisterTransferCancelHandler(transferId);
      }
    },
    [directManagerRef, roomId, memberId]
  );

  return { sendDirectOrFallback };
}

import { useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import {
  DirectTransferManager,
  type DirectFileHeader,
  type SignalPayload,
} from '@/src/lib/webrtc/DirectTransferManager';
import { buildWsUrl } from '@/src/config/env';
import { ensureEphemeralSession } from '@/src/services/authService';
import { streamLocalFileToPipe } from '@/src/services/fileService';
import { fetchRoomSnapshot } from '@/src/services/roomService';
import { useRoomStore } from '@/src/stores/useRoomStore';
import { useTransferStore } from '@/src/stores/useTransferStore';
import { useUIStore } from '@/src/stores/useUIStore';
import type { Room, RoomJoinRequest, RoomMember, RoomMessage, SharedFile } from '@/src/types';

export function useRoomRealtime(roomId: string | null, memberId: string | null) {
  const wsRef = useRef<WebSocket | null>(null);
  const directManagerRef = useRef<DirectTransferManager | null>(null);
  const typingTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const emitTyping = useCallback((isTyping: boolean) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ event: 'typing', data: { isTyping } }));
  }, []);

  useEffect(() => {
    if (!roomId || !memberId) return;

    let cancelled = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

    const connect = async () => {
      if (cancelled) return;
      const roomStore = useRoomStore.getState();
      roomStore.setRealtimeStatus('connecting');

      try {
        const { token } = await ensureEphemeralSession();
        if (cancelled) return;

        const wsUrl = buildWsUrl(
          `/ws?token=${encodeURIComponent(token)}&roomId=${encodeURIComponent(roomId)}&memberId=${encodeURIComponent(memberId)}`
        );
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        const directManager = new DirectTransferManager(
          (payload) => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ event: 'webrtc-signal', data: payload }));
            }
          },
          memberId,
          {
            onIncomingProgress: (header: DirectFileHeader, bytesReceived: number, speedBps: number) => {
              const remaining = Math.max(0, header.fileSize - bytesReceived);
              const eta = speedBps > 0 ? remaining / speedBps : null;
              useTransferStore.getState().upsertTransfer({
                id: header.transferId,
                fileId: header.fileId,
                fileName: header.fileName,
                fileSize: header.fileSize,
                mimeType: header.mimeType,
                direction: 'download',
                mode: 'webrtc',
                status: 'transferring',
                bytesTransferred: bytesReceived,
                progress: header.fileSize > 0 ? Math.min(100, Math.round((bytesReceived / header.fileSize) * 100)) : 100,
                speedBytesPerSec: speedBps,
                etaSeconds: eta,
                startedAt: Date.now(),
              });
            },
            onIncomingComplete: (header: DirectFileHeader, blob: Blob) => {
              const url = URL.createObjectURL(blob);
              useRoomStore.getState().registerDirectBlob(header.fileId, url, header.fileName, header.mimeType);
              useRoomStore.getState().upsertFile({
                id: header.fileId,
                room_id: roomId,
                uploaded_by: header.senderMemberId,
                original_file_name: header.fileName,
                storage_path: '',
                mime_type: header.mimeType,
                file_extension: header.fileName.split('.').pop()?.toLowerCase() || '',
                file_size: header.fileSize,
                transfer_mode: 'webrtc',
                upload_status: 'available',
                checksum: null,
                created_at: new Date().toISOString(),
                expires_at: useRoomStore.getState().room?.expires_at || new Date(Date.now() + 3600000).toISOString(),
                deleted_at: null,
              });
              useTransferStore.getState().updateTransfer(header.transferId, {
                status: 'completed',
                progress: 100,
                bytesTransferred: header.fileSize,
                speedBytesPerSec: 0,
                etaSeconds: 0,
              });
              toast.success(`Received ${header.fileName} directly via WebRTC`);
            },
            onIncomingError: (transferId: string, error: string) => {
              useTransferStore.getState().updateTransfer(transferId, {
                status: 'failed',
                errorMessage: error,
                speedBytesPerSec: 0,
                etaSeconds: null,
              });
            },
            onPeerStateChange: () => {},
          }
        );
        directManagerRef.current = directManager;

        ws.onopen = async () => {
          if (cancelled) return;
          useRoomStore.getState().setRealtimeStatus('connected');
          try {
            const snapshot = await fetchRoomSnapshot(roomId);
            useRoomStore.getState().setRoomSnapshot(snapshot);
          } catch {
            // Snapshot errors handled gracefully
          }
        };

        ws.onmessage = (event) => {
          try {
            const parsed = JSON.parse(event.data as string) as { event: string; data: unknown };
            switch (parsed.event) {
              case 'room:updated':
                useRoomStore.getState().updateRoom(parsed.data as Room);
                break;
              case 'member:updated':
                useRoomStore.getState().upsertMember(parsed.data as RoomMember);
                break;
              case 'file:added':
                useRoomStore.getState().upsertFile(parsed.data as SharedFile);
                break;
              case 'file:deleted':
                useRoomStore.getState().removeFile((parsed.data as { fileId: string }).fileId);
                break;
              case 'file:pull': {
                const { streamId, fileId, fileName } = parsed.data as {
                  streamId: string;
                  fileId: string;
                  fileName: string;
                };
                void streamLocalFileToPipe(streamId, fileId, fileName).catch(() => {});
                break;
              }
              case 'message:added': {
                const ui = useUIStore.getState();
                const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
                const isChatVisible = isMobile ? ui.mobileTab === 'chat' : ui.isChatOpen;
                useRoomStore.getState().addMessage(parsed.data as RoomMessage, isChatVisible);
                break;
              }
              case 'message:deleted':
                useRoomStore.getState().markMessageDeleted((parsed.data as { messageId: string }).messageId);
                break;
              case 'join-request:updated':
                useRoomStore.getState().upsertJoinRequest(parsed.data as RoomJoinRequest);
                break;
              case 'presence:sync':
                useRoomStore.getState().setOnlineMemberIds((parsed.data as { onlineMemberIds: string[] }).onlineMemberIds);
                break;
              case 'typing': {
                const { memberId: typingId, isTyping } = parsed.data as { memberId: string; isTyping: boolean };
                useRoomStore.getState().setMemberTyping(typingId, isTyping);
                if (typingTimeoutsRef.current[typingId]) clearTimeout(typingTimeoutsRef.current[typingId]);
                if (isTyping) {
                  typingTimeoutsRef.current[typingId] = setTimeout(() => {
                    useRoomStore.getState().setMemberTyping(typingId, false);
                  }, 4000);
                }
                break;
              }
              case 'webrtc-signal':
                void directManagerRef.current?.handleSignal(parsed.data as SignalPayload);
                break;
            }
          } catch {
            // Ignore malformed socket event
          }
        };

        ws.onclose = (ev) => {
          if (cancelled) return;
          if (ev.code === 4003 || ev.code === 4004) {
            useRoomStore.getState().setRealtimeStatus('disconnected');
            return;
          }
          useRoomStore.getState().setRealtimeStatus('reconnecting');
          reconnectTimer = setTimeout(() => void connect(), 2500);
        };

        heartbeatTimer = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ event: 'heartbeat' }));
          }
        }, 25000);
      } catch {
        if (!cancelled) {
          useRoomStore.getState().setRealtimeStatus('reconnecting');
          reconnectTimer = setTimeout(() => void connect(), 3000);
        }
      }
    };

    void connect();

    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      Object.values(typingTimeoutsRef.current).forEach(clearTimeout);
      typingTimeoutsRef.current = {};
      directManagerRef.current?.destroy();
      directManagerRef.current = null;
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [roomId, memberId]);

  return {
    directManagerRef,
    emitTyping,
  };
}

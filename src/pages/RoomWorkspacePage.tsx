import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AppHeader } from '@/src/components/common/AppHeader';
import { AppSidebar } from '@/src/components/common/AppSidebar';
import { ConfirmDialog } from '@/src/components/common/ConfirmDialog';
import { ConnectionStatus } from '@/src/components/common/ConnectionStatus';
import { EmptyState } from '@/src/components/common/EmptyState';
import { LoadingSkeleton } from '@/src/components/common/LoadingSkeleton';
import { PWAInstallButton } from '@/src/components/common/PWAInstallButton';
import {
  ChatIcon,
  DocFileIcon,
  DropBridgeMark,
  SettingsIcon,
} from '@/src/components/common/StreamlineIcons';
import { MobileNavigation } from '@/src/components/layout/MobileNavigation';
import { Button } from '@/src/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/src/components/ui/sheet';
import { ChatPanel } from '@/src/features/chat/ChatPanel';
import { DeviceList } from '@/src/features/devices/DeviceList';
import { FileCard } from '@/src/features/files/FileCard';
import { FileDetailsDialog } from '@/src/features/files/FileDetailsDialog';
import { FileDropzone } from '@/src/features/files/FileDropzone';
import { FilePreviewDialog } from '@/src/features/files/FilePreviewDialog';
import { FileTable } from '@/src/features/files/FileTable';
import { FileToolbar } from '@/src/features/files/FileToolbar';
import { QRCodeDialog } from '@/src/features/rooms/QRCodeDialog';
import { RoomCodeDisplay } from '@/src/features/rooms/RoomCodeDisplay';
import { RoomExpirationTimer } from '@/src/features/rooms/RoomExpirationTimer';
import { RoomStatusScreen } from '@/src/features/rooms/RoomStatusScreen';
import { RoomSettingsDialog } from '@/src/features/settings/RoomSettingsDialog';
import { TransferQueue } from '@/src/features/transfers/TransferQueue';
import { useClipboardPaste } from '@/src/hooks/useClipboardPaste';
import { useDebounce } from '@/src/hooks/useDebounce';
import { useDirectTransfer } from '@/src/hooks/useDirectTransfer';
import { useRoomRealtime } from '@/src/hooks/useRoomRealtime';
import { ensureEphemeralSession } from '@/src/services/authService';
import {
  deleteSharedFile,
  downloadFilesAsZip,
  downloadSingleFile,
  shareFileInSession,
} from '@/src/services/fileService';
import { fetchRoomSnapshot, joinRoom, leaveRoom } from '@/src/services/roomService';
import { useRoomStore } from '@/src/stores/useRoomStore';
import { useSessionStore } from '@/src/stores/useSessionStore';
import { useTransferStore } from '@/src/stores/useTransferStore';
import { useUIStore } from '@/src/stores/useUIStore';
import type { SharedFile, TransferItem } from '@/src/types';
import { categorizeFile } from '@/src/utils/fileTypes';
import { formatBytes } from '@/src/utils/format';

interface RoomWorkspacePageProps {
  roomCode: string;
  initialRoomId?: string;
  initialMemberId?: string;
  onExitRoom: () => void;
}

export function RoomWorkspacePage({
  roomCode,
  initialRoomId,
  initialMemberId,
  onExitRoom,
}: RoomWorkspacePageProps) {
  const [resolvedRoomId, setResolvedRoomId] = useState<string | null>(initialRoomId || null);
  const [resolvedMemberId, setResolvedMemberId] = useState<string | null>(initialMemberId || null);
  const [deleteTarget, setDeleteTarget] = useState<SharedFile | null>(null);
  const [deletingFile, setDeletingFile] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [mobileRoomSheetOpen, setMobileRoomSheetOpen] = useState(false);

  const displayName = useSessionStore((s) => s.displayName);
  const room = useRoomStore((s) => s.room);
  const currentMember = useRoomStore((s) => s.currentMember);
  const members = useRoomStore((s) => s.members);
  const onlineIds = useRoomStore((s) => s.onlineMemberIds);
  const files = useRoomStore((s) => s.files);
  const realtimeStatus = useRoomStore((s) => s.realtimeStatus);
  const terminalError = useRoomStore((s) => s.terminalError);
  const isLoadingRoom = useRoomStore((s) => s.isLoadingRoom);
  const unreadMessagesCount = useRoomStore((s) => s.unreadMessagesCount);

  const transfers = useTransferStore((s) => s.transfers);
  const preferredMode = useTransferStore((s) => s.preferredMode);
  const targetPeerMemberId = useTransferStore((s) => s.targetPeerMemberId);

  const viewMode = useUIStore((s) => s.viewMode);
  const activeCategory = useUIStore((s) => s.activeCategory);
  const sortBy = useUIStore((s) => s.sortBy);
  const sortDir = useUIStore((s) => s.sortDir);
  const searchQuery = useUIStore((s) => s.searchQuery);
  const selectedFileIds = useUIStore((s) => s.selectedFileIds);
  const isChatOpen = useUIStore((s) => s.isChatOpen);
  const mobileTab = useUIStore((s) => s.mobileTab);
  const previewFileId = useUIStore((s) => s.previewFileId);
  const detailsFileId = useUIStore((s) => s.detailsFileId);
  const isSettingsOpen = useUIStore((s) => s.isSettingsOpen);
  const isQRDialogOpen = useUIStore((s) => s.isQRDialogOpen);

  const debouncedSearch = useDebounce(searchQuery, 200);

  // Initialize or rejoin room when navigated directly via URL (/room/123456)
  useEffect(() => {
    let cancelled = false;
    const roomStore = useRoomStore.getState();

    const init = async () => {
      if (terminalError?.type === 'pending_approval') return;
      roomStore.setLoadingRoom(true);

      try {
        let rId = initialRoomId || resolvedRoomId;
        let mId = initialMemberId || resolvedMemberId;

        if (!rId) {
          const joinRes = await joinRoom({ roomCode, displayName });
          if (cancelled) return;
          if (joinRes.status === 'joined') {
            rId = joinRes.room_id;
            mId = joinRes.member_id;
            setResolvedRoomId(rId);
            setResolvedMemberId(mId);
          } else if (joinRes.status === 'pending_approval') {
            setResolvedRoomId(joinRes.room_id);
            setResolvedMemberId(joinRes.member_id);
            roomStore.setTerminalError({
              type: 'pending_approval',
              roomName: joinRes.room_name,
              requestId: joinRes.request_id,
              roomId: joinRes.room_id,
              memberId: joinRes.member_id,
            });
            roomStore.setLoadingRoom(false);
            return;
          } else {
            const errType =
              joinRes.status === 'expired'
                ? 'expired'
                : joinRes.status === 'ended'
                  ? 'ended'
                  : joinRes.status === 'locked'
                    ? 'locked'
                    : joinRes.status === 'rejected'
                      ? 'rejected'
                      : 'not_found';
            roomStore.setTerminalError({ type: errType, message: joinRes.message });
            roomStore.setLoadingRoom(false);
            return;
          }
        }

        const snapshot = await fetchRoomSnapshot(rId);
        if (cancelled) return;
        roomStore.setRoomSnapshot(snapshot);
        setResolvedMemberId(snapshot.currentMember.id);
      } catch (err) {
        if (!cancelled) {
          roomStore.setTerminalError({
            type: 'connection_lost',
            message: err instanceof Error ? err.message : 'Unable to connect to room.',
          });
          roomStore.setLoadingRoom(false);
        }
      }
    };

    void init();
    return () => {
      cancelled = true;
    };
  }, [roomCode, initialRoomId, initialMemberId]);

  // Listen via ephemeral WebSocket for host approval when waiting in pending_approval state
  useEffect(() => {
    if (terminalError?.type !== 'pending_approval') return;
    const { roomId: pendingRoomId, memberId: errorMemberId } = terminalError;
    const targetMemberId = errorMemberId || resolvedMemberId || initialMemberId;
    if (!targetMemberId) return;

    let cancelled = false;
    let ws: WebSocket | null = null;

    const connectPendingListener = async () => {
      try {
        const { token } = await ensureEphemeralSession();
        if (cancelled) return;
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws?token=${encodeURIComponent(token)}&roomId=${encodeURIComponent(pendingRoomId)}&memberId=${encodeURIComponent(targetMemberId)}`;
        ws = new WebSocket(wsUrl);

        ws.onmessage = async (event) => {
          try {
            const parsed = JSON.parse(event.data as string) as {
              event: string;
              data?: { decision?: string };
            };
            if (parsed.event === 'join-request:resolved') {
              if (parsed.data?.decision === 'approved') {
                useRoomStore.getState().setTerminalError(null);
                setResolvedRoomId(pendingRoomId);
                setResolvedMemberId(targetMemberId);
                const snapshot = await fetchRoomSnapshot(pendingRoomId);
                if (!cancelled) {
                  useRoomStore.getState().setRoomSnapshot(snapshot);
                  setResolvedMemberId(snapshot.currentMember.id);
                }
              } else if (parsed.data?.decision === 'rejected') {
                useRoomStore.getState().setTerminalError({
                  type: 'rejected',
                  message: 'The room host declined your join request.',
                });
              }
            } else if (parsed.event === 'room:updated') {
              const updatedRoom = parsed.data as { status?: string };
              if (updatedRoom?.status === 'ended' || updatedRoom?.status === 'expired') {
                useRoomStore.getState().setTerminalError({
                  type: updatedRoom.status,
                  message:
                    updatedRoom.status === 'ended'
                      ? 'This session was ended by the host.'
                      : 'This session has expired.',
                });
              }
            }
          } catch {
            // Ignore malformed socket event
          }
        };
      } catch {
        // Ignore connection error while awaiting approval
      }
    };

    void connectPendingListener();

    return () => {
      cancelled = true;
      if (ws) {
        ws.close();
        ws = null;
      }
    };
  }, [terminalError, resolvedMemberId, initialMemberId]);

  const { directManagerRef, emitTyping } = useRoomRealtime(
    terminalError ? null : resolvedRoomId,
    terminalError ? null : resolvedMemberId
  );

  const { sendDirectOrFallback } = useDirectTransfer(
    directManagerRef,
    resolvedRoomId,
    resolvedMemberId
  );

  const membersById = useMemo(
    () => Object.fromEntries(members.map((m) => [m.id, m])),
    [members]
  );

  const handleFilesUpload = useCallback(
    async (incomingFiles: File[]) => {
      if (!room || !currentMember) return;
      if (!room.allow_upload && currentMember.role !== 'host') {
        toast.error('Guest uploads are disabled by the host.');
        return;
      }

      const activeOnlinePeers = members.filter(
        (m) => m.id !== currentMember.id && m.membership_status === 'active' && onlineIds.includes(m.id)
      );

      for (const file of incomingFiles) {
        if (file.size > room.max_file_size_bytes) {
          toast.error(`${file.name} exceeds max size (${formatBytes(room.max_file_size_bytes, 0)}).`);
          continue;
        }

        if (preferredMode === 'webrtc' && activeOnlinePeers.length > 0) {
          const targetPeer =
            activeOnlinePeers.find((p) => p.id === targetPeerMemberId) || activeOnlinePeers[0];
          void sendDirectOrFallback(file, targetPeer.id, targetPeer.display_name);
        } else {
          void shareFileInSession({
            roomId: room.id,
            file,
            transferMode: 'cloud',
          }).catch((err) => {
            toast.error(err instanceof Error ? err.message : `Failed to share ${file.name}`);
          });
        }
      }
    },
    [room, currentMember, members, onlineIds, preferredMode, targetPeerMemberId, sendDirectOrFallback]
  );

  useClipboardPaste(
    useCallback(
      (pastedFiles) => {
        if (pastedFiles.length > 0) {
          toast.info(`Pasted ${pastedFiles.length} item(s) from clipboard`);
          void handleFilesUpload(pastedFiles);
        }
      },
      [handleFilesUpload]
    ),
    Boolean(room && currentMember && (room.allow_upload || currentMember.role === 'host'))
  );

  const handleRetryUpload = (transfer: TransferItem) => {
    if (!transfer.retryFile || !room || !currentMember) return;
    void shareFileInSession({
      roomId: room.id,
      file: transfer.retryFile,
      transferMode: 'cloud',
    }).catch((err) => {
      toast.error(err instanceof Error ? err.message : 'Retry failed');
    });
  };

  const handleDownloadFile = async (file: SharedFile) => {
    if (!room || !currentMember) return;
    if (!room.allow_download && currentMember.role !== 'host') {
      toast.error('File downloads are disabled by the host.');
      return;
    }
    try {
      await downloadSingleFile(file);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Download failed');
    }
  };

  const handleDownloadZip = async (targetFiles: SharedFile[]) => {
    if (!room) return;
    setIsZipping(true);
    try {
      await downloadFilesAsZip(targetFiles, room.room_code);
      toast.success('ZIP archive downloaded');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to create ZIP archive');
    } finally {
      setIsZipping(false);
    }
  };

  const handleConfirmDeleteFile = async () => {
    if (!deleteTarget || !room) return;
    setDeletingFile(true);
    try {
      await deleteSharedFile(room.id, deleteTarget.id);
      toast.success(`${deleteTarget.original_file_name} removed`);
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to delete file');
    } finally {
      setDeletingFile(false);
    }
  };

  const handleLeave = async () => {
    if (room) {
      await leaveRoom(room.id);
    }
    useRoomStore.getState().resetRoom();
    onExitRoom();
  };

  const filteredFiles = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();
    return files
      .filter((f) => {
        if (activeCategory !== 'all' && categorizeFile(f) !== activeCategory) return false;
        if (!query) return true;
        const senderName = membersById[f.uploaded_by]?.display_name?.toLowerCase() || '';
        return f.original_file_name.toLowerCase().includes(query) || senderName.includes(query);
      })
      .sort((a, b) => {
        const dir = sortDir === 'asc' ? 1 : -1;
        if (sortBy === 'name') return a.original_file_name.localeCompare(b.original_file_name) * dir;
        if (sortBy === 'size') return (a.file_size - b.file_size) * dir;
        if (sortBy === 'sender') {
          const sa = membersById[a.uploaded_by]?.display_name || '';
          const sb = membersById[b.uploaded_by]?.display_name || '';
          return sa.localeCompare(sb) * dir;
        }
        return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * dir;
      });
  }, [files, activeCategory, debouncedSearch, sortBy, sortDir, membersById]);

  const totalTransferredSize = useMemo(
    () => files.reduce((acc, f) => acc + (f.file_size || 0), 0),
    [files]
  );

  const activeTransfersCount = transfers.filter(
    (t) => t.status === 'transferring' || t.status === 'queued'
  ).length;

  const previewFile = files.find((f) => f.id === previewFileId) || null;
  const detailsFile = files.find((f) => f.id === detailsFileId) || null;

  if (terminalError) {
    return (
      <RoomStatusScreen
        error={terminalError}
        onGoHome={() => {
          useRoomStore.getState().resetRoom();
          onExitRoom();
        }}
        onRetry={
          terminalError.type === 'connection_lost'
            ? () => window.location.reload()
            : undefined
        }
      />
    );
  }

  if (isLoadingRoom || !room || !currentMember) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="mx-auto max-w-5xl space-y-6">
          <LoadingSkeleton rows={6} />
        </div>
      </div>
    );
  }

  const isHost = currentMember.role === 'host';
  const canUpload = room.allow_upload || isHost;
  const canDownload = room.allow_download || isHost;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      {/* Top Room Header */}
      <AppHeader
        left={
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => void handleLeave()}
              className="flex items-center gap-2 text-sm font-bold text-foreground hover:opacity-80 shrink-0"
              title="Leave room"
            >
              <DropBridgeMark size={24} />
              <span className="hidden sm:inline">DropBridge</span>
            </button>
            <span className="hidden sm:inline text-border">/</span>
            <span className="hidden md:inline truncate max-w-[180px] text-sm font-medium text-foreground">
              {room.room_name}
            </span>
            <div className="lg:hidden">
              <RoomCodeDisplay
                compact
                roomCode={room.room_code}
                onOpenQR={() => useUIStore.getState().setQRDialogOpen(true)}
              />
            </div>
          </div>
        }
        right={
          <div className="flex items-center gap-2 sm:gap-3">
            <ConnectionStatus status={realtimeStatus} />
            <RoomExpirationTimer
              expiresAt={room.expires_at}
              onExpired={() =>
                useRoomStore.getState().setTerminalError({
                  type: 'expired',
                  message: 'This room has expired and its shared files are no longer accessible.',
                })
              }
            />
            <div className="hidden sm:block">
              <PWAInstallButton />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="hidden lg:inline-flex relative"
              onClick={() => {
                const next = !isChatOpen;
                useUIStore.getState().setChatOpen(next);
                if (next) useRoomStore.getState().clearUnreadMessages();
              }}
            >
              <ChatIcon size={15} />
              <span>Chat</span>
              {unreadMessagesCount > 0 && !isChatOpen && (
                <span className="ml-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground tabular-nums">
                  {unreadMessagesCount}
                </span>
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => useUIStore.getState().setSettingsOpen(true)}
              aria-label="Room settings"
              title="Room settings"
            >
              <SettingsIcon size={17} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="hidden sm:inline-flex"
              onClick={() => void handleLeave()}
            >
              Leave
            </Button>
          </div>
        }
      />

      {/* Main 3-Zone Workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar (Desktop) */}
        <AppSidebar side="left" className="overflow-y-auto p-4 space-y-6">
          <div>
            <h2 className="text-sm font-semibold text-foreground truncate">{room.room_name}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {room.is_locked ? 'Locked' : 'Open'} · {room.has_password ? 'Password protected' : 'Code access'}
            </p>
            <div className="mt-3">
              <RoomCodeDisplay
                roomCode={room.room_code}
                onOpenQR={() => useUIStore.getState().setQRDialogOpen(true)}
              />
            </div>
          </div>

          <div className="space-y-1 border-t border-border pt-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Session Volume</span>
              <span className="font-mono text-foreground tabular-nums">
                {formatBytes(totalTransferredSize)}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Zero server storage · streamed live from sender devices
            </p>
          </div>

          <div className="border-t border-border pt-4">
            <DeviceList />
          </div>
        </AppSidebar>

        {/* Center Workspace */}
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-6">
          <div className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6">
            {/* Mobile Compact Room Bar */}
            <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-2.5 lg:hidden">
              <div className="text-xs">
                <span className="font-semibold text-foreground">{room.room_name}</span>
                <span className="ml-2 text-muted-foreground tabular-nums">
                  {members.length} {members.length === 1 ? 'device' : 'devices'}
                </span>
              </div>
              <Button size="sm" variant="outline" onClick={() => setMobileRoomSheetOpen(true)}>
                Room Info
              </Button>
            </div>

            {/* Desktop always shows Files + Transfers; Mobile switches by tab */}
            <div className={mobileTab === 'files' ? 'space-y-5' : 'hidden lg:block lg:space-y-5'}>
              {/* Useful 4-stat summary strip */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-border bg-surface px-4 py-3">
                  <p className="text-xs text-muted-foreground">Shared Files</p>
                  <p className="mt-1 font-mono text-lg font-semibold text-foreground tabular-nums">
                    {files.length}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-surface px-4 py-3">
                  <p className="text-xs text-muted-foreground">Total Size</p>
                  <p className="mt-1 font-mono text-lg font-semibold text-foreground tabular-nums">
                    {formatBytes(totalTransferredSize)}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-surface px-4 py-3">
                  <p className="text-xs text-muted-foreground">Devices</p>
                  <p className="mt-1 font-mono text-lg font-semibold text-foreground tabular-nums">
                    {members.length}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-surface px-4 py-3">
                  <p className="text-xs text-muted-foreground">Active Transfers</p>
                  <p className="mt-1 font-mono text-lg font-semibold text-foreground tabular-nums">
                    {activeTransfersCount}
                  </p>
                </div>
              </div>

              <FileDropzone
                disabled={!canUpload}
                disabledReason="Guest uploads are disabled by the host"
                maxFileSizeBytes={room.max_file_size_bytes}
                onFilesSelected={(selected) => void handleFilesUpload(selected)}
              />

              {/* Desktop inline transfer queue when transfers exist */}
              <div className="hidden lg:block">
                <TransferQueue onRetryUpload={handleRetryUpload} />
              </div>

              <FileToolbar
                totalCount={files.length}
                selectedCount={selectedFileIds.length}
                allowDownload={canDownload}
                isZipping={isZipping}
                onDownloadSelected={() => {
                  const selected = files.filter((f) => selectedFileIds.includes(f.id));
                  if (selected.length === 1) {
                    void handleDownloadFile(selected[0]);
                  } else {
                    void handleDownloadZip(selected);
                  }
                }}
                onDownloadAllZip={() => void handleDownloadZip(files)}
              />

              {filteredFiles.length === 0 ? (
                <EmptyState
                  icon={<DocFileIcon size={22} />}
                  title={files.length === 0 ? 'No files shared yet' : 'No matching files'}
                  description={
                    files.length === 0
                      ? 'Drop files above or select from your device to share them instantly with everyone in this room.'
                      : 'Try clearing your search query or switching file category filters.'
                  }
                />
              ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredFiles.map((file) => (
                    <FileCard
                      key={file.id}
                      file={file}
                      sender={membersById[file.uploaded_by]}
                      isSelected={selectedFileIds.includes(file.id)}
                      canDelete={isHost || file.uploaded_by === currentMember.id}
                      allowDownload={canDownload}
                      onToggleSelect={() => useUIStore.getState().toggleFileSelection(file.id)}
                      onPreview={() => useUIStore.getState().setPreviewFileId(file.id)}
                      onDownload={() => void handleDownloadFile(file)}
                      onShowDetails={() => useUIStore.getState().setDetailsFileId(file.id)}
                      onDelete={() => setDeleteTarget(file)}
                    />
                  ))}
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden sm:block">
                    <FileTable
                      files={filteredFiles}
                      membersById={membersById}
                      selectedIds={selectedFileIds}
                      currentMemberId={currentMember.id}
                      isHost={isHost}
                      allowDownload={canDownload}
                      onToggleSelect={(id) => useUIStore.getState().toggleFileSelection(id)}
                      onToggleSelectAll={() => {
                        if (selectedFileIds.length === filteredFiles.length) {
                          useUIStore.getState().clearFileSelection();
                        } else {
                          useUIStore.getState().selectAllFiles(filteredFiles.map((f) => f.id));
                        }
                      }}
                      onPreview={(file) => useUIStore.getState().setPreviewFileId(file.id)}
                      onDownload={(file) => void handleDownloadFile(file)}
                      onShowDetails={(file) => useUIStore.getState().setDetailsFileId(file.id)}
                      onDelete={(file) => setDeleteTarget(file)}
                    />
                  </div>
                  {/* Mobile Compact File Cards */}
                  <div className="space-y-2.5 sm:hidden">
                    {filteredFiles.map((file) => (
                      <FileCard
                        key={file.id}
                        file={file}
                        sender={membersById[file.uploaded_by]}
                        isSelected={selectedFileIds.includes(file.id)}
                        canDelete={isHost || file.uploaded_by === currentMember.id}
                        allowDownload={canDownload}
                        onToggleSelect={() => useUIStore.getState().toggleFileSelection(file.id)}
                        onPreview={() => useUIStore.getState().setPreviewFileId(file.id)}
                        onDownload={() => void handleDownloadFile(file)}
                        onShowDetails={() => useUIStore.getState().setDetailsFileId(file.id)}
                        onDelete={() => setDeleteTarget(file)}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Mobile Transfers Tab */}
            {mobileTab === 'transfers' && (
              <div className="lg:hidden">
                <TransferQueue onRetryUpload={handleRetryUpload} showEmpty />
              </div>
            )}

            {/* Mobile Chat Tab */}
            {mobileTab === 'chat' && (
              <div className="h-[calc(100vh-13rem)] overflow-hidden rounded-xl border border-border lg:hidden">
                <ChatPanel onTypingChange={emitTyping} />
              </div>
            )}

            {/* Mobile Devices Tab */}
            {mobileTab === 'devices' && (
              <div className="lg:hidden">
                <DeviceList />
              </div>
            )}
          </div>
        </main>

        {/* Right Collapsible Chat Sidebar (Desktop) */}
        {isChatOpen && (
          <AppSidebar side="right">
            <ChatPanel onTypingChange={emitTyping} />
          </AppSidebar>
        )}
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNavigation />

      {/* Mobile Room Info Bottom Sheet */}
      <Sheet open={mobileRoomSheetOpen} onOpenChange={setMobileRoomSheetOpen}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>{room.room_name}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <RoomCodeDisplay
              roomCode={room.room_code}
              onOpenQR={() => {
                setMobileRoomSheetOpen(false);
                useUIStore.getState().setQRDialogOpen(true);
              }}
            />
            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setMobileRoomSheetOpen(false);
                  useUIStore.getState().setSettingsOpen(true);
                }}
              >
                Settings
              </Button>
              <Button variant="destructive" onClick={() => void handleLeave()}>
                Leave Room
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Dialogs */}
      <FilePreviewDialog
        file={previewFile}
        open={!!previewFile}
        allowDownload={canDownload}
        onOpenChange={(open) => !open && useUIStore.getState().setPreviewFileId(null)}
        onDownload={(f) => void handleDownloadFile(f)}
      />

      <FileDetailsDialog
        file={detailsFile}
        sender={detailsFile ? membersById[detailsFile.uploaded_by] : undefined}
        open={!!detailsFile}
        onOpenChange={(open) => !open && useUIStore.getState().setDetailsFileId(null)}
      />

      <RoomSettingsDialog
        open={isSettingsOpen}
        onOpenChange={(open) => useUIStore.getState().setSettingsOpen(open)}
      />

      <QRCodeDialog
        open={isQRDialogOpen}
        onOpenChange={(open) => useUIStore.getState().setQRDialogOpen(open)}
        roomCode={room.room_code}
        roomName={room.room_name}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Shared File"
        description={`Delete "${deleteTarget?.original_file_name || ''}" for everyone in this room? This action cannot be undone.`}
        confirmLabel="Delete File"
        destructive
        isLoading={deletingFile}
        onConfirm={handleConfirmDeleteFile}
      />
    </div>
  );
}

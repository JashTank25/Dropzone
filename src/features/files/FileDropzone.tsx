import { useRef, useState } from 'react';
import { Button } from '@/src/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui/select';
import {
  BoltIcon,
  CameraIcon,
  FolderUploadIcon,
  ImageFileIcon,
  UploadIcon,
} from '@/src/components/common/StreamlineIcons';
import { useTransferStore } from '@/src/stores/useTransferStore';
import { useRoomStore } from '@/src/stores/useRoomStore';
import { formatBytes } from '@/src/utils/format';
import { cn } from '@/src/utils/cn';

interface FileDropzoneProps {
  disabled?: boolean;
  disabledReason?: string;
  maxFileSizeBytes: number;
  onFilesSelected: (files: File[]) => void;
}

export function FileDropzone({
  disabled = false,
  disabledReason,
  maxFileSizeBytes,
  onFilesSelected,
}: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const preferredMode = useTransferStore((s) => s.preferredMode);
  const setPreferredMode = useTransferStore((s) => s.setPreferredMode);
  const targetPeerMemberId = useTransferStore((s) => s.targetPeerMemberId);
  const setTargetPeerMemberId = useTransferStore((s) => s.setTargetPeerMemberId);

  const currentMember = useRoomStore((s) => s.currentMember);
  const members = useRoomStore((s) => s.members);
  const onlineIds = useRoomStore((s) => s.onlineMemberIds);

  const otherOnlinePeers = members.filter(
    (m) => m.id !== currentMember?.id && m.membership_status === 'active' && onlineIds.includes(m.id)
  );

  const handleFileList = (list: FileList | null) => {
    if (!list || list.length === 0 || disabled) return;
    onFilesSelected(Array.from(list));
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        handleFileList(e.dataTransfer.files);
      }}
      className={cn(
        'rounded-xl border border-dashed bg-surface p-5 transition-colors',
        isDragging ? 'border-primary bg-primary/5' : 'border-border',
        disabled && 'opacity-70'
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <UploadIcon size={22} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              {disabled
                ? disabledReason || 'Uploads are disabled'
                : 'Drop files here or choose from your device'}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Supports documents, images, videos, archives, and code up to {formatBytes(maxFileSizeBytes, 0)} per file · Paste screenshots with Ctrl/Cmd+V
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            type="button"
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
          >
            <UploadIcon size={16} />
            <span>Select Files</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => folderInputRef.current?.click()}
            className="hidden sm:inline-flex"
          >
            <FolderUploadIcon size={15} />
            <span>Folder</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => galleryInputRef.current?.click()}
            className="sm:hidden"
          >
            <ImageFileIcon size={15} />
            <span>Gallery</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => cameraInputRef.current?.click()}
            className="sm:hidden"
          >
            <CameraIcon size={15} />
            <span>Camera</span>
          </Button>
        </div>
      </div>

      {/* Transfer mode selector bar */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3 text-xs">
        <div className="flex items-center gap-1.5 rounded-lg bg-surface-subtle p-1">
          <button
            type="button"
            onClick={() => setPreferredMode('cloud')}
            className={cn(
              'rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0',
              preferredMode === 'cloud'
                ? 'bg-surface text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Live Session Relay
          </button>
          <button
            type="button"
            onClick={() => setPreferredMode('webrtc')}
            className={cn(
              'inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0',
              preferredMode === 'webrtc'
                ? 'bg-surface text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <BoltIcon size={13} className="text-primary" />
            <span>Direct Transfer (P2P)</span>
          </button>
        </div>

        {preferredMode === 'webrtc' ? (
          <div className="flex items-center gap-2">
            {otherOnlinePeers.length > 0 ? (
              <Select
                value={targetPeerMemberId || otherOnlinePeers[0].id}
                onValueChange={(val) => setTargetPeerMemberId(val)}
              >
                <SelectTrigger className="h-8 w-48 text-xs">
                  <SelectValue placeholder="Select target device" />
                </SelectTrigger>
                <SelectContent>
                  {otherOnlinePeers.map((peer) => (
                    <SelectItem key={peer.id} value={peer.id}>
                      {peer.display_name} ({peer.operating_system})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <span className="text-muted-foreground">
                No online peer available for P2P — using Live Session Relay
              </span>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground">
            Streamed live from your device during this session — never stored on any server
          </span>
        )}
      </div>

      {/* Hidden inputs for files, folders, gallery, and camera */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          handleFileList(e.target.files);
          e.target.value = '';
        }}
      />
      <input
        ref={folderInputRef}
        type="file"
        multiple
        // @ts-expect-error webkitdirectory is supported on desktop Chromium/Firefox/Safari
        webkitdirectory=""
        className="hidden"
        onChange={(e) => {
          handleFileList(e.target.files);
          e.target.value = '';
        }}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={(e) => {
          handleFileList(e.target.files);
          e.target.value = '';
        }}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          handleFileList(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
}

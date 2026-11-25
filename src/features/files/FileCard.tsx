import { Checkbox } from '@/src/components/ui/checkbox';
import { Button } from '@/src/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/src/components/ui/dropdown-menu';
import {
  CopyIcon,
  DownloadIcon,
  EyeIcon,
  InfoIcon,
  MoreVerticalIcon,
  TrashIcon,
} from '@/src/components/common/StreamlineIcons';
import { FileTypeIcon } from '@/src/features/files/FileTypeIcon';
import { formatBytes, formatTimeShort } from '@/src/utils/format';
import type { RoomMember, SharedFile } from '@/src/types';
import { toast } from 'sonner';

interface FileCardProps {
  file: SharedFile;
  sender?: RoomMember;
  isSelected: boolean;
  canDelete: boolean;
  allowDownload: boolean;
  onToggleSelect: () => void;
  onPreview: () => void;
  onDownload: () => void;
  onShowDetails: () => void;
  onDelete: () => void;
}

export function FileCard({
  file,
  sender,
  isSelected,
  canDelete,
  allowDownload,
  onToggleSelect,
  onPreview,
  onDownload,
  onShowDetails,
  onDelete,
}: FileCardProps) {
  const isAvailable = file.upload_status === 'available';

  return (
    <div className="flex flex-col justify-between rounded-xl border border-border bg-surface p-4 transition-colors hover:border-input-border">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3 min-w-0">
          <Checkbox
            checked={isSelected}
            onCheckedChange={onToggleSelect}
            className="mt-1"
            aria-label={`Select ${file.original_file_name}`}
          />
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-subtle">
            <FileTypeIcon file={file} size={22} />
          </div>
          <div className="min-w-0">
            <button
              type="button"
              disabled={!isAvailable}
              onClick={onPreview}
              className="block w-full truncate text-left text-sm font-semibold text-foreground hover:text-primary"
              title={file.original_file_name}
            >
              {file.original_file_name}
            </button>
            <p className="mt-1 text-xs text-muted-foreground tabular-nums">
              {formatBytes(file.file_size)} · {sender?.display_name || 'Member'} · {formatTimeShort(file.created_at)}
            </p>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="File actions">
              <MoreVerticalIcon size={16} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem disabled={!isAvailable} onClick={onPreview}>
              <EyeIcon size={15} />
              <span>Preview</span>
            </DropdownMenuItem>
            {allowDownload && (
              <DropdownMenuItem disabled={!isAvailable} onClick={onDownload}>
                <DownloadIcon size={15} />
                <span>Download</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={() => {
                void navigator.clipboard.writeText(file.original_file_name);
                toast.success('File name copied');
              }}
            >
              <CopyIcon size={15} />
              <span>Copy file name</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onShowDetails}>
              <InfoIcon size={15} />
              <span>View details</span>
            </DropdownMenuItem>
            {canDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem destructive onClick={onDelete}>
                  <TrashIcon size={15} />
                  <span>Delete</span>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs">
        <span className={isAvailable ? 'text-success font-medium' : 'text-warning font-medium'}>
          {isAvailable
            ? file.transfer_mode === 'webrtc'
              ? 'Direct (P2P)'
              : 'Available'
            : file.upload_status === 'uploading'
              ? 'Uploading...'
              : file.upload_status}
        </span>
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="sm" disabled={!isAvailable} onClick={onPreview}>
            Preview
          </Button>
          {allowDownload && (
            <Button variant="outline" size="sm" disabled={!isAvailable} onClick={onDownload}>
              <DownloadIcon size={14} />
              <span>Save</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

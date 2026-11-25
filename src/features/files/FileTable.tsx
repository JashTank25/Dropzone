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

interface FileTableProps {
  files: SharedFile[];
  membersById: Record<string, RoomMember>;
  selectedIds: string[];
  currentMemberId: string;
  isHost: boolean;
  allowDownload: boolean;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onPreview: (file: SharedFile) => void;
  onDownload: (file: SharedFile) => void;
  onShowDetails: (file: SharedFile) => void;
  onDelete: (file: SharedFile) => void;
}

export function FileTable({
  files,
  membersById,
  selectedIds,
  currentMemberId,
  isHost,
  allowDownload,
  onToggleSelect,
  onToggleSelectAll,
  onPreview,
  onDownload,
  onShowDetails,
  onDelete,
}: FileTableProps) {
  const allSelected = files.length > 0 && selectedIds.length === files.length;

  const copyName = async (name: string) => {
    try {
      await navigator.clipboard.writeText(name);
      toast.success('File name copied');
    } catch {
      toast.error('Unable to copy file name');
    }
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-subtle/60 text-xs font-medium text-muted-foreground">
            <th className="w-10 px-4 py-3">
              <Checkbox
                checked={allSelected}
                onCheckedChange={onToggleSelectAll}
                aria-label="Select all files"
              />
            </th>
            <th className="px-3 py-3">File Name</th>
            <th className="px-3 py-3 text-right">Size</th>
            <th className="hidden md:table-cell px-3 py-3">Shared By</th>
            <th className="hidden sm:table-cell px-3 py-3">Time</th>
            <th className="hidden lg:table-cell px-3 py-3">Status</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {files.map((file) => {
            const sender = membersById[file.uploaded_by];
            const isSelected = selectedIds.includes(file.id);
            const canDelete = isHost || file.uploaded_by === currentMemberId;
            const isAvailable = file.upload_status === 'available';

            return (
              <tr
                key={file.id}
                className="group transition-colors hover:bg-surface-subtle/40"
              >
                <td className="px-4 py-2.5">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onToggleSelect(file.id)}
                    aria-label={`Select ${file.original_file_name}`}
                  />
                </td>
                <td className="px-3 py-2.5">
                  <button
                    type="button"
                    onClick={() => isAvailable && onPreview(file)}
                    disabled={!isAvailable}
                    className="flex max-w-[260px] sm:max-w-[340px] items-center gap-2.5 text-left font-medium text-foreground hover:text-primary disabled:cursor-default disabled:hover:text-foreground"
                  >
                    <FileTypeIcon file={file} size={20} />
                    <span className="truncate">{file.original_file_name}</span>
                  </button>
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                  {formatBytes(file.file_size)}
                </td>
                <td className="hidden md:table-cell px-3 py-2.5 text-xs text-muted-foreground">
                  <span className="truncate block max-w-[140px]">
                    {sender?.display_name || 'Member'}
                  </span>
                </td>
                <td className="hidden sm:table-cell px-3 py-2.5 font-mono text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                  {formatTimeShort(file.created_at)}
                </td>
                <td className="hidden lg:table-cell px-3 py-2.5 text-xs whitespace-nowrap">
                  {file.upload_status === 'available' ? (
                    <span className="text-success font-medium">
                      {file.transfer_mode === 'webrtc' ? 'Direct (P2P)' : 'Live Stream'}
                    </span>
                  ) : file.upload_status === 'uploading' ? (
                    <span className="text-warning font-medium">Uploading...</span>
                  ) : (
                    <span className="text-destructive font-medium capitalize">{file.upload_status}</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <div className="inline-flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={!isAvailable}
                      onClick={() => onPreview(file)}
                      aria-label={`Preview ${file.original_file_name}`}
                      title="Preview"
                    >
                      <EyeIcon size={16} />
                    </Button>
                    {allowDownload && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={!isAvailable}
                        onClick={() => onDownload(file)}
                        aria-label={`Download ${file.original_file_name}`}
                        title="Download"
                      >
                        <DownloadIcon size={16} />
                      </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label="More file actions">
                          <MoreVerticalIcon size={16} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem disabled={!isAvailable} onClick={() => onPreview(file)}>
                          <EyeIcon size={15} />
                          <span>Preview</span>
                        </DropdownMenuItem>
                        {allowDownload && (
                          <DropdownMenuItem disabled={!isAvailable} onClick={() => onDownload(file)}>
                            <DownloadIcon size={15} />
                            <span>Download</span>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => void copyName(file.original_file_name)}>
                          <CopyIcon size={15} />
                          <span>Copy file name</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onShowDetails(file)}>
                          <InfoIcon size={15} />
                          <span>View details</span>
                        </DropdownMenuItem>
                        {canDelete && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem destructive onClick={() => onDelete(file)}>
                              <TrashIcon size={15} />
                              <span>Delete</span>
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

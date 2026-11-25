import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui/select';
import {
  DownloadIcon,
  GridViewIcon,
  ListViewIcon,
  SearchIcon,
} from '@/src/components/common/StreamlineIcons';
import { useUIStore, type FileSortBy } from '@/src/stores/useUIStore';
import type { FileCategory } from '@/src/types';
import { cn } from '@/src/utils/cn';

const CATEGORIES: { id: FileCategory; label: string }[] = [
  { id: 'all', label: 'All Files' },
  { id: 'documents', label: 'Documents' },
  { id: 'spreadsheets', label: 'Spreadsheets' },
  { id: 'presentations', label: 'Presentations' },
  { id: 'images', label: 'Images' },
  { id: 'videos', label: 'Videos' },
  { id: 'audio', label: 'Audio' },
  { id: 'archives', label: 'Archives' },
  { id: 'others', label: 'Others' },
];

interface FileToolbarProps {
  totalCount: number;
  selectedCount: number;
  allowDownload: boolean;
  isZipping: boolean;
  onDownloadSelected: () => void;
  onDownloadAllZip: () => void;
}

export function FileToolbar({
  totalCount,
  selectedCount,
  allowDownload,
  isZipping,
  onDownloadSelected,
  onDownloadAllZip,
}: FileToolbarProps) {
  const searchQuery = useUIStore((s) => s.searchQuery);
  const setSearchQuery = useUIStore((s) => s.setSearchQuery);
  const activeCategory = useUIStore((s) => s.activeCategory);
  const setActiveCategory = useUIStore((s) => s.setActiveCategory);
  const sortBy = useUIStore((s) => s.sortBy);
  const setSort = useUIStore((s) => s.setSort);
  const viewMode = useUIStore((s) => s.viewMode);
  const setViewMode = useUIStore((s) => s.setViewMode);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <SearchIcon size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search files or sender..."
            className="h-9 pl-9 text-sm"
            aria-label="Search shared files"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={sortBy} onValueChange={(v) => setSort(v as FileSortBy)}>
            <SelectTrigger className="h-9 w-36 text-xs">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Newest first</SelectItem>
              <SelectItem value="name">File name</SelectItem>
              <SelectItem value="size">File size</SelectItem>
              <SelectItem value="sender">Sender</SelectItem>
            </SelectContent>
          </Select>

          <div className="hidden sm:flex items-center rounded-lg border border-border bg-surface p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              aria-label="List view"
              className={cn(
                'rounded-md p-1.5 transition-colors',
                viewMode === 'table' ? 'bg-surface-subtle text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <ListViewIcon size={16} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
              className={cn(
                'rounded-md p-1.5 transition-colors',
                viewMode === 'grid' ? 'bg-surface-subtle text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <GridViewIcon size={16} />
            </button>
          </div>

          {allowDownload && selectedCount > 0 && (
            <Button size="sm" variant="outline" disabled={isZipping} onClick={onDownloadSelected}>
              <DownloadIcon size={14} />
              <span>Download ({selectedCount})</span>
            </Button>
          )}

          {allowDownload && totalCount > 0 && (
            <Button size="sm" variant="outline" disabled={isZipping} onClick={onDownloadAllZip}>
              <DownloadIcon size={14} />
              <span>{isZipping ? 'Preparing ZIP...' : 'Download All ZIP'}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Category filter bar */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors',
                isActive
                  ? 'bg-foreground text-primary-foreground'
                  : 'bg-surface border border-border text-muted-foreground hover:text-foreground'
              )}
            >
              {cat.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

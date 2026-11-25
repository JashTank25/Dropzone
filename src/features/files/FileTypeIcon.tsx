import {
  ArchiveFileIcon,
  AudioFileIcon,
  DocFileIcon,
  GenericFileIcon,
  ImageFileIcon,
  SheetFileIcon,
  SlideFileIcon,
  VideoFileIcon,
} from '@/src/components/common/StreamlineIcons';
import { categorizeFile } from '@/src/utils/fileTypes';
import type { SharedFile } from '@/src/types';

interface FileTypeIconProps {
  file: Pick<SharedFile, 'file_extension' | 'mime_type' | 'original_file_name'>;
  size?: number;
}

export function FileTypeIcon({ file, size = 20 }: FileTypeIconProps) {
  const category = categorizeFile(file);
  switch (category) {
    case 'documents':
      return <DocFileIcon size={size} className="text-primary" />;
    case 'spreadsheets':
      return <SheetFileIcon size={size} className="text-success" />;
    case 'presentations':
      return <SlideFileIcon size={size} className="text-warning" />;
    case 'images':
      return <ImageFileIcon size={size} className="text-primary" />;
    case 'videos':
      return <VideoFileIcon size={size} className="text-destructive" />;
    case 'audio':
      return <AudioFileIcon size={size} className="text-warning" />;
    case 'archives':
      return <ArchiveFileIcon size={size} className="text-muted-foreground" />;
    default:
      return <GenericFileIcon size={size} className="text-muted-foreground" />;
  }
}

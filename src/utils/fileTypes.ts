import type { FileCategory, SharedFile } from '@/src/types';

const DOCUMENT_EXTS = new Set(['pdf', 'doc', 'docx', 'txt', 'md', 'rtf', 'odt', 'json', 'xml', 'yaml', 'yml', 'log', 'ts', 'tsx', 'js', 'jsx', 'py', 'sql', 'css', 'html', 'sh', 'go', 'rs', 'java', 'c', 'cpp']);
const SPREADSHEET_EXTS = new Set(['xls', 'xlsx', 'csv', 'tsv', 'ods']);
const PRESENTATION_EXTS = new Set(['ppt', 'pptx', 'key', 'odp']);
const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'avif', 'heic']);
const VIDEO_EXTS = new Set(['mp4', 'webm', 'mov', 'mkv', 'avi', 'm4v']);
const AUDIO_EXTS = new Set(['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'opus']);
const ARCHIVE_EXTS = new Set(['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz']);

export function getFileExtension(fileName: string): string {
  const parts = fileName.toLowerCase().split('.');
  return parts.length > 1 ? parts[parts.length - 1] : '';
}

export function categorizeFile(file: Pick<SharedFile, 'file_extension' | 'mime_type' | 'original_file_name'>): Exclude<FileCategory, 'all'> {
  const ext = (file.file_extension || getFileExtension(file.original_file_name)).toLowerCase();
  const mime = (file.mime_type || '').toLowerCase();

  if (IMAGE_EXTS.has(ext) || mime.startsWith('image/')) return 'images';
  if (VIDEO_EXTS.has(ext) || mime.startsWith('video/')) return 'videos';
  if (AUDIO_EXTS.has(ext) || mime.startsWith('audio/')) return 'audio';
  if (SPREADSHEET_EXTS.has(ext) || mime.includes('spreadsheet') || mime === 'text/csv') return 'spreadsheets';
  if (PRESENTATION_EXTS.has(ext) || mime.includes('presentation')) return 'presentations';
  if (ARCHIVE_EXTS.has(ext) || mime.includes('zip') || mime.includes('archive') || mime.includes('compressed')) return 'archives';
  if (DOCUMENT_EXTS.has(ext) || mime.startsWith('text/') || mime === 'application/pdf' || mime.includes('wordprocessingml') || mime === 'application/json') {
    return 'documents';
  }
  return 'others';
}

export function resolveDuplicateFileName(desiredName: string, existingNames: string[]): string {
  const clean = sanitizeClientFileName(desiredName);
  const existingSet = new Set(existingNames.map((n) => n.toLowerCase()));
  if (!existingSet.has(clean.toLowerCase())) {
    return clean;
  }
  const dotIdx = clean.lastIndexOf('.');
  const base = dotIdx > 0 ? clean.slice(0, dotIdx) : clean;
  const ext = dotIdx > 0 ? clean.slice(dotIdx) : '';
  let counter = 1;
  while (existingSet.has(`${base} (${counter})${ext}`.toLowerCase())) {
    counter += 1;
  }
  return `${base} (${counter})${ext}`;
}

export function sanitizeClientFileName(rawName: string): string {
  const stripped = rawName
    .replace(/[\\/:*?"<>|\u0000-\u001F]/g, '_')
    .replace(/\.{2,}/g, '.')
    .trim()
    .replace(/^[.\s]+|[.\s]+$/g, '');
  if (!stripped) return 'untitled_file';
  return stripped.slice(0, 240);
}

export function isPreviewSupported(file: Pick<SharedFile, 'file_extension' | 'mime_type' | 'original_file_name'>):
  | 'pdf'
  | 'image'
  | 'spreadsheet'
  | 'docx'
  | 'json'
  | 'text'
  | 'audio'
  | 'video'
  | 'unsupported' {
  const ext = (file.file_extension || getFileExtension(file.original_file_name)).toLowerCase();
  const mime = (file.mime_type || '').toLowerCase();

  if (ext === 'pdf' || mime === 'application/pdf') return 'pdf';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'avif'].includes(ext) || (mime.startsWith('image/') && ext !== 'svg')) return 'image';
  if (ext === 'svg') return 'text'; // Render SVG safely as source code, never execute inline SVG scripts
  if (['xlsx', 'xls', 'csv', 'tsv'].includes(ext) || mime === 'text/csv' || mime.includes('spreadsheet')) return 'spreadsheet';
  if (ext === 'docx' || mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'docx';
  if (ext === 'json' || mime === 'application/json') return 'json';
  if (['txt', 'md', 'log', 'xml', 'yaml', 'yml', 'ts', 'tsx', 'js', 'jsx', 'py', 'sql', 'css', 'html', 'sh', 'go', 'rs', 'java', 'c', 'cpp'].includes(ext) || mime.startsWith('text/')) {
    return 'text';
  }
  if (AUDIO_EXTS.has(ext) || mime.startsWith('audio/')) return 'audio';
  if (VIDEO_EXTS.has(ext) || mime.startsWith('video/')) return 'video';
  return 'unsupported';
}

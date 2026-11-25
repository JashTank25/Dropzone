import { describe, expect, it } from 'vitest';
import {
  categorizeFile,
  isPreviewSupported,
  resolveDuplicateFileName,
  sanitizeClientFileName,
} from '../utils/fileTypes';

describe('fileTypes utilities', () => {
  it('sanitizes unsafe path traversal and control characters', () => {
    expect(sanitizeClientFileName('../../etc/passwd')).toBe('_._etc_passwd');
    expect(sanitizeClientFileName('  report:final?.pdf  ')).toBe('report_final_.pdf');
    expect(sanitizeClientFileName('...')).toBe('untitled_file');
  });

  it('resolves duplicate filenames deterministically', () => {
    const existing = ['Report.pdf', 'Report (1).pdf'];
    expect(resolveDuplicateFileName('Report.pdf', existing)).toBe('Report (2).pdf');
    expect(resolveDuplicateFileName('Photo.png', existing)).toBe('Photo.png');
  });

  it('categorizes common file formats', () => {
    expect(categorizeFile({ original_file_name: 'deck.pptx', file_extension: 'pptx', mime_type: '' })).toBe('presentations');
    expect(categorizeFile({ original_file_name: 'budget.xlsx', file_extension: 'xlsx', mime_type: '' })).toBe('spreadsheets');
    expect(categorizeFile({ original_file_name: 'photo.webp', file_extension: 'webp', mime_type: 'image/webp' })).toBe('images');
    expect(categorizeFile({ original_file_name: 'backup.zip', file_extension: 'zip', mime_type: 'application/zip' })).toBe('archives');
  });

  it('forces HTML and SVG files into read-only text preview mode', () => {
    expect(isPreviewSupported({ original_file_name: 'malicious.svg', file_extension: 'svg', mime_type: 'image/svg+xml' })).toBe('text');
    expect(isPreviewSupported({ original_file_name: 'page.html', file_extension: 'html', mime_type: 'text/html' })).toBe('text');
    expect(isPreviewSupported({ original_file_name: 'installer.exe', file_extension: 'exe', mime_type: 'application/octet-stream' })).toBe('unsupported');
  });
});

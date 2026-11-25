import { useEffect, useRef, useState } from 'react';
import DOMPurify from 'dompurify';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/src/components/ui/dialog';
import { Button } from '@/src/components/ui/button';
import { Skeleton } from '@/src/components/ui/skeleton';
import {
  AlertIcon,
  CloseIcon,
  DownloadIcon,
  RotateIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from '@/src/components/common/StreamlineIcons';
import { FileTypeIcon } from '@/src/features/files/FileTypeIcon';
import { getSessionFileUrl } from '@/src/services/fileService';
import { isPreviewSupported } from '@/src/utils/fileTypes';
import { formatBytes } from '@/src/utils/format';
import type { SharedFile } from '@/src/types';

interface FilePreviewDialogProps {
  file: SharedFile | null;
  open: boolean;
  allowDownload: boolean;
  onOpenChange: (open: boolean) => void;
  onDownload: (file: SharedFile) => void;
}

interface SpreadsheetData {
  sheetNames: string[];
  sheets: Record<string, string[][]>;
}

export function FilePreviewDialog({
  file,
  open,
  allowDownload,
  onOpenChange,
  onDownload,
}: FilePreviewDialogProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Image controls
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  // Parsed previews
  const [textContent, setTextContent] = useState<string | null>(null);
  const [docxHtml, setDocxHtml] = useState<string | null>(null);
  const [spreadsheet, setSpreadsheet] = useState<SpreadsheetData | null>(null);
  const [activeSheet, setActiveSheet] = useState<string>('');

  // PDF canvas state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [pdfPage, setPdfPage] = useState(1);
  const [pdfTotalPages, setPdfTotalPages] = useState(0);
  const pdfDocRef = useRef<{ getPage: (n: number) => Promise<unknown>; cleanup?: () => Promise<void> } | null>(null);

  const previewKind = file ? isPreviewSupported(file) : 'unsupported';

  useEffect(() => {
    setZoom(1);
    setRotation(0);
    setTextContent(null);
    setDocxHtml(null);
    setSpreadsheet(null);
    setActiveSheet('');
    setPdfPage(1);
    setPdfTotalPages(0);
    setSignedUrl(null);
    setError(null);

    if (!open || !file) return;

    let cancelled = false;
    let urlToRevoke: string | null = null;

    const loadPreview = async () => {
      setLoading(true);
      try {
        const { url, revokeAfter } = await getSessionFileUrl(file);
        if (cancelled) {
          if (revokeAfter) URL.revokeObjectURL(url);
          return;
        }
        if (revokeAfter) urlToRevoke = url;
        setSignedUrl(url);

        if (previewKind === 'unsupported') {
          setLoading(false);
          return;
        }

        if (previewKind === 'image' || previewKind === 'audio' || previewKind === 'video') {
          setLoading(false);
          return;
        }

        const MAX_IN_MEMORY_PREVIEW = 15 * 1024 * 1024;
        if (file.file_size > MAX_IN_MEMORY_PREVIEW) {
          throw new Error('File is too large for inline browser preview. Download the file to view it locally.');
        }

        const response = await fetch(url);
        if (!response.ok) throw new Error('Unable to fetch file content for preview.');

        if (previewKind === 'text' || previewKind === 'json') {
          const rawText = await response.text();
          if (cancelled) return;
          if (previewKind === 'json') {
            try {
              setTextContent(JSON.stringify(JSON.parse(rawText), null, 2));
            } catch {
              setTextContent(rawText);
            }
          } else {
            setTextContent(rawText);
          }
        } else if (previewKind === 'spreadsheet') {
          const ext = (file.file_extension || file.original_file_name.split('.').pop() || '').toLowerCase();
          if (ext === 'csv' || ext === 'tsv' || file.mime_type === 'text/csv') {
            const text = await response.text();
            if (cancelled) return;
            const delimiter = ext === 'tsv' ? '\t' : ',';
            const rows: string[][] = [];
            let currentRow: string[] = [];
            let currentField = '';
            let inQuotes = false;
            for (let i = 0; i < text.length && rows.length < 500; i++) {
              const ch = text[i];
              if (inQuotes) {
                if (ch === '"' && text[i + 1] === '"') {
                  currentField += '"';
                  i += 1;
                } else if (ch === '"') {
                  inQuotes = false;
                } else {
                  currentField += ch;
                }
              } else if (ch === '"') {
                inQuotes = true;
              } else if (ch === delimiter) {
                currentRow.push(currentField);
                currentField = '';
              } else if (ch === '\n' || ch === '\r') {
                if (ch === '\r' && text[i + 1] === '\n') i += 1;
                currentRow.push(currentField);
                rows.push(currentRow);
                currentRow = [];
                currentField = '';
              } else {
                currentField += ch;
              }
            }
            if (currentField.length > 0 || currentRow.length > 0) {
              currentRow.push(currentField);
              rows.push(currentRow);
            }
            setSpreadsheet({ sheetNames: ['Sheet1'], sheets: { Sheet1: rows } });
            setActiveSheet('Sheet1');
          } else {
            const blob = await response.blob();
            if (cancelled) return;
            const { default: readXlsxFile } = await import('read-excel-file/browser');
            const parsedSheets = await readXlsxFile(blob);
            if (cancelled) return;
            const sheets: Record<string, string[][]> = {};
            const sheetNames: string[] = [];
            for (const s of parsedSheets) {
              sheetNames.push(s.sheet);
              sheets[s.sheet] = s.data.slice(0, 500).map((row) =>
                row.map((cell) => (cell === null || cell === undefined ? '' : String(cell)))
              );
            }
            setSpreadsheet({ sheetNames, sheets });
            setActiveSheet(sheetNames[0] || '');
          }
        } else if (previewKind === 'docx') {
          const buffer = await response.arrayBuffer();
          if (cancelled) return;
          const mammoth = await import('mammoth');
          const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
          const cleanHtml = DOMPurify.sanitize(result.value, {
            USE_PROFILES: { html: true },
            FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form'],
            FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
          });
          setDocxHtml(cleanHtml);
        } else if (previewKind === 'pdf') {
          const buffer = await response.arrayBuffer();
          if (cancelled) return;
          const pdfjsLib = await import('pdfjs-dist');
          pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
            'pdfjs-dist/build/pdf.worker.min.mjs',
            import.meta.url
          ).toString();
          const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
          const doc = await loadingTask.promise;
          if (cancelled) {
            await doc.cleanup();
            return;
          }
          pdfDocRef.current = doc;
          setPdfTotalPages(doc.numPages);
          setPdfPage(1);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Preview unavailable');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadPreview();

    return () => {
      cancelled = true;
      if (urlToRevoke) {
        URL.revokeObjectURL(urlToRevoke);
      }
      if (pdfDocRef.current?.cleanup) {
        void pdfDocRef.current.cleanup();
        pdfDocRef.current = null;
      }
    };
  }, [open, file, previewKind]);

  // Render PDF page when pdfPage or pdfTotalPages changes
  useEffect(() => {
    if (previewKind !== 'pdf' || !pdfDocRef.current || pdfTotalPages === 0) return;
    let active = true;

    const renderPage = async () => {
      try {
        const doc = pdfDocRef.current as {
          getPage: (n: number) => Promise<{
            getViewport: (opts: { scale: number }) => { width: number; height: number };
            render: (opts: { canvasContext: CanvasRenderingContext2D; viewport: unknown }) => { promise: Promise<void> };
          }>;
        };
        const page = await doc.getPage(pdfPage);
        if (!active || !canvasRef.current) return;
        const viewport = page.getViewport({ scale: 1.4 });
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: ctx, viewport }).promise;
      } catch {
        // Ignore render cancellation
      }
    };

    void renderPage();
    return () => {
      active = false;
    };
  }, [previewKind, pdfPage, pdfTotalPages]);

  if (!file) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90vh] w-[calc(100%-1.5rem)] max-w-5xl flex-col p-0 overflow-hidden">
        {/* Top bar */}
        <DialogHeader className="flex-row items-center justify-between gap-4 border-b border-border bg-surface px-5 py-3.5">
          <div className="flex min-w-0 items-center gap-3">
            <FileTypeIcon file={file} size={22} />
            <div className="min-w-0">
              <DialogTitle className="truncate text-sm sm:text-base">{file.original_file_name}</DialogTitle>
              <DialogDescription className="text-xs tabular-nums">
                {formatBytes(file.file_size)} · {file.mime_type || 'Unknown type'}
              </DialogDescription>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {allowDownload && (
              <Button size="sm" variant="outline" onClick={() => onDownload(file)}>
                <DownloadIcon size={15} />
                <span className="hidden sm:inline">Download</span>
              </Button>
            )}
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              aria-label="Close preview"
            >
              <CloseIcon size={18} />
            </Button>
          </div>
        </DialogHeader>

        {/* Preview viewport */}
        <div className="relative flex-1 overflow-auto bg-background p-4 sm:p-6">
          {loading && (
            <div className="space-y-3 max-w-2xl mx-auto">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-80 w-full rounded-xl" />
            </div>
          )}

          {!loading && error && (
            <div className="mx-auto mt-10 max-w-md rounded-xl border border-border bg-surface p-6 text-center">
              <AlertIcon size={24} className="mx-auto mb-2 text-warning" />
              <h3 className="text-sm font-semibold text-foreground">Preview Unavailable</h3>
              <p className="mt-1 text-xs text-muted-foreground">{error}</p>
              {allowDownload && (
                <Button className="mt-4" size="sm" onClick={() => onDownload(file)}>
                  <DownloadIcon size={15} />
                  <span>Download Original File</span>
                </Button>
              )}
            </div>
          )}

          {!loading && !error && previewKind === 'image' && signedUrl && (
            <div className="flex h-full flex-col items-center justify-between gap-4">
              <div className="flex flex-1 items-center justify-center overflow-auto w-full">
                <img
                  src={signedUrl}
                  alt={file.original_file_name}
                  referrerPolicy="no-referrer"
                  className="max-h-full max-w-full rounded-lg border border-border object-contain transition-transform duration-150"
                  style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}
                />
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 shadow-xs">
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))))}
                  aria-label="Zoom out"
                >
                  <ZoomOutIcon size={16} />
                </Button>
                <span className="w-12 text-center font-mono text-xs tabular-nums">
                  {Math.round(zoom * 100)}%
                </span>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => setZoom((z) => Math.min(3, Number((z + 0.25).toFixed(2))))}
                  aria-label="Zoom in"
                >
                  <ZoomInIcon size={16} />
                </Button>
                <div className="h-4 w-px bg-border" />
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  aria-label="Rotate 90 degrees"
                >
                  <RotateIcon size={16} />
                </Button>
              </div>
            </div>
          )}

          {!loading && !error && previewKind === 'pdf' && pdfTotalPages > 0 && (
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 shadow-xs">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pdfPage <= 1}
                  onClick={() => setPdfPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <span className="px-2 font-mono text-xs tabular-nums text-foreground">
                  Page {pdfPage} / {pdfTotalPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pdfPage >= pdfTotalPages}
                  onClick={() => setPdfPage((p) => Math.min(pdfTotalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
              <canvas ref={canvasRef} className="max-w-full rounded-lg border border-border bg-surface shadow-sm" />
            </div>
          )}

          {!loading && !error && previewKind === 'spreadsheet' && spreadsheet && (
            <div className="space-y-3">
              {spreadsheet.sheetNames.length > 1 && (
                <div className="flex items-center gap-1 overflow-x-auto pb-1">
                  {spreadsheet.sheetNames.map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setActiveSheet(name)}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                        activeSheet === name
                          ? 'bg-primary text-primary-foreground'
                          : 'border border-border bg-surface text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              )}
              <div className="overflow-auto rounded-lg border border-border bg-surface max-h-[68vh]">
                <table className="w-full border-collapse text-left font-mono text-xs tabular-nums">
                  <tbody>
                    {(spreadsheet.sheets[activeSheet] || []).map((row, rIdx) => (
                      <tr
                        key={rIdx}
                        className={rIdx === 0 ? 'bg-surface-subtle font-semibold text-foreground' : 'border-t border-border'}
                      >
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="border-r border-border px-3 py-2 whitespace-nowrap max-w-[260px] truncate">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!loading && !error && previewKind === 'docx' && docxHtml !== null && (
            <div
              className="mx-auto max-w-3xl rounded-xl border border-border bg-surface p-6 sm:p-8 text-sm leading-relaxed text-foreground [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mb-3 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-5 [&_h2]:mb-2 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:p-2"
              dangerouslySetInnerHTML={{ __html: docxHtml }}
            />
          )}

          {!loading && !error && (previewKind === 'text' || previewKind === 'json') && textContent !== null && (
            <pre className="mx-auto max-w-4xl overflow-auto rounded-xl border border-border bg-surface p-5 font-mono text-xs leading-relaxed text-foreground">
              <code>{textContent}</code>
            </pre>
          )}

          {!loading && !error && previewKind === 'audio' && signedUrl && (
            <div className="mx-auto mt-16 max-w-md rounded-xl border border-border bg-surface p-6 text-center">
              <FileTypeIcon file={file} size={36} />
              <p className="mt-3 text-sm font-medium text-foreground truncate">{file.original_file_name}</p>
              <audio controls src={signedUrl} className="mt-4 w-full" />
            </div>
          )}

          {!loading && !error && previewKind === 'video' && signedUrl && (
            <div className="flex h-full items-center justify-center">
              <video
                controls
                src={signedUrl}
                className="max-h-full max-w-full rounded-xl border border-border bg-foreground"
              />
            </div>
          )}

          {!loading && !error && previewKind === 'unsupported' && (
            <div className="mx-auto mt-10 max-w-md rounded-xl border border-border bg-surface p-8 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-surface-subtle">
                <FileTypeIcon file={file} size={26} />
              </div>
              <h3 className="text-base font-semibold text-foreground">Preview Not Available</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                This binary or archive format cannot be previewed safely in the browser.
              </p>
              <div className="mt-4 rounded-lg bg-surface-subtle px-3 py-2 text-xs font-mono text-muted-foreground tabular-nums">
                {formatBytes(file.file_size)} · {file.mime_type || 'application/octet-stream'}
              </div>
              {allowDownload && (
                <Button className="mt-5 w-full" onClick={() => onDownload(file)}>
                  <DownloadIcon size={16} />
                  <span>Download File</span>
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

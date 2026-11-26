import JSZip from 'jszip';
import { buildApiUrl } from '@/src/config/env';
import { authedFetch, ensureEphemeralSession } from '@/src/services/authService';
import { useRoomStore } from '@/src/stores/useRoomStore';
import {
  registerTransferCancelHandler,
  unregisterTransferCancelHandler,
  useTransferStore,
} from '@/src/stores/useTransferStore';
import type { SharedFile } from '@/src/types';
import { resolveDuplicateFileName } from '@/src/utils/fileTypes';

// Ephemeral browser-memory registry of File handles shared by this device in the current session.
// Zero files are ever uploaded to or stored on any server or database.
const localSessionFiles = new Map<string, File>();

export function clearLocalSessionFiles(): void {
  localSessionFiles.clear();
}

export function getLocalSessionFile(fileId: string): File | undefined {
  return localSessionFiles.get(fileId);
}

async function computeFileChecksum(file: File): Promise<string | null> {
  if (file.size > 25 * 1024 * 1024 || !crypto?.subtle) return null;
  try {
    const buffer = await file.arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  } catch {
    return null;
  }
}

export async function shareFileInSession(params: {
  roomId: string;
  file: File;
  transferMode?: 'cloud' | 'webrtc';
}): Promise<SharedFile> {
  const { roomId, file, transferMode = 'cloud' } = params;
  const roomState = useRoomStore.getState();
  const existingNames = roomState.files.map((f) => f.original_file_name);
  const resolvedName = resolveDuplicateFileName(file.name, existingNames);
  const fileId = crypto.randomUUID();
  const checksum = await computeFileChecksum(file);

  // Hold File handle strictly in sender browser memory for live streaming
  localSessionFiles.set(fileId, file);

  const res = await authedFetch(`/api/rooms/${roomId}/files`, {
    method: 'POST',
    body: JSON.stringify({
      fileId,
      originalFileName: resolvedName,
      mimeType: file.type || 'application/octet-stream',
      fileSize: file.size,
      transferMode,
      checksum,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    localSessionFiles.delete(fileId);
    throw new Error(data.error || 'Unable to share file in room.');
  }

  return data as SharedFile;
}

// Called automatically on sender's device when a receiver requests a file via live relay stream
export async function streamLocalFileToPipe(
  streamId: string,
  fileId: string,
  fileName: string
): Promise<void> {
  const file = localSessionFiles.get(fileId);
  if (!file) return;

  const { token } = await ensureEphemeralSession();
  const transferId = crypto.randomUUID();
  const startedAt = Date.now();

  useTransferStore.getState().upsertTransfer({
    id: transferId,
    fileId,
    fileName,
    fileSize: file.size,
    mimeType: file.type || 'application/octet-stream',
    direction: 'upload',
    mode: 'cloud',
    status: 'transferring',
    bytesTransferred: 0,
    progress: 0,
    speedBytesPerSec: 0,
    etaSeconds: null,
    startedAt,
  });

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', buildApiUrl(`/api/streams/${encodeURIComponent(streamId)}`), true);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('Content-Type', 'application/octet-stream');

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const elapsed = Math.max(0.1, (Date.now() - startedAt) / 1000);
        const speed = event.loaded / elapsed;
        const eta = speed > 0 ? Math.max(0, event.total - event.loaded) / speed : null;
        useTransferStore.getState().updateTransfer(transferId, {
          bytesTransferred: event.loaded,
          progress: event.total > 0 ? Math.min(100, Math.round((event.loaded / event.total) * 100)) : 100,
          speedBytesPerSec: speed,
          etaSeconds: eta,
        });
      }
    };

    xhr.onload = () => {
      unregisterTransferCancelHandler(transferId);
      if (xhr.status >= 200 && xhr.status < 300) {
        useTransferStore.getState().updateTransfer(transferId, {
          status: 'completed',
          progress: 100,
          bytesTransferred: file.size,
          speedBytesPerSec: 0,
          etaSeconds: 0,
        });
        resolve();
      } else {
        useTransferStore.getState().updateTransfer(transferId, {
          status: 'failed',
          errorMessage: 'Stream relay failed',
          speedBytesPerSec: 0,
          etaSeconds: null,
        });
        reject(new Error('Stream failed'));
      }
    };

    xhr.onerror = () => {
      unregisterTransferCancelHandler(transferId);
      useTransferStore.getState().updateTransfer(transferId, {
        status: 'failed',
        errorMessage: 'Network error during live stream',
        speedBytesPerSec: 0,
        etaSeconds: null,
      });
      reject(new Error('Network error'));
    };

    xhr.onabort = () => {
      unregisterTransferCancelHandler(transferId);
      reject(new Error('Stream cancelled'));
    };

    registerTransferCancelHandler(transferId, () => xhr.abort());
    xhr.send(file);
  });
}

export async function getSessionFileUrl(file: SharedFile): Promise<{ url: string; revokeAfter: boolean }> {
  // 1. If this device is the sender, create an instant local Object URL
  const localFile = localSessionFiles.get(file.id);
  if (localFile) {
    return { url: URL.createObjectURL(localFile), revokeAfter: true };
  }

  // 2. If already received via WebRTC P2P in this session
  const directBlob = useRoomStore.getState().directFileBlobs[file.id];
  if (directBlob) {
    return { url: directBlob.url, revokeAfter: false };
  }

  // 3. Otherwise request a live zero-storage relay stream URL from the sender via server pipe
  const res = await authedFetch(`/api/rooms/${file.room_id}/files/${file.id}/stream-token`, {
    method: 'POST',
  });
  const data = await res.json();
  if (!res.ok || !data.streamUrl) {
    throw new Error(data.error || 'Unable to connect live file stream.');
  }
  return { url: buildApiUrl(data.streamUrl as string), revokeAfter: false };
}

export async function downloadSingleFile(file: SharedFile): Promise<void> {
  const { url, revokeAfter } = await getSessionFileUrl(file);
  const transferId = crypto.randomUUID();
  const startedAt = Date.now();

  if (url.startsWith('blob:')) {
    const a = document.createElement('a');
    a.href = url;
    a.download = file.original_file_name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    if (revokeAfter) setTimeout(() => URL.revokeObjectURL(url), 10000);
    return;
  }

  useTransferStore.getState().upsertTransfer({
    id: transferId,
    fileId: file.id,
    fileName: file.original_file_name,
    fileSize: file.file_size,
    mimeType: file.mime_type,
    direction: 'download',
    mode: 'cloud',
    status: 'transferring',
    bytesTransferred: 0,
    progress: 0,
    speedBytesPerSec: 0,
    etaSeconds: null,
    startedAt,
  });

  const controller = new AbortController();
  registerTransferCancelHandler(transferId, () => controller.abort());

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok || !response.body) {
      const errData = await response.json().catch(() => ({}));
      throw new Error((errData as { error?: string }).error || 'Live stream unavailable');
    }

    const total = Number(response.headers.get('content-length')) || file.file_size;
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let received = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        received += value.byteLength;
        const elapsed = Math.max(0.1, (Date.now() - startedAt) / 1000);
        const speed = received / elapsed;
        const eta = speed > 0 && total > 0 ? Math.max(0, total - received) / speed : null;
        useTransferStore.getState().updateTransfer(transferId, {
          bytesTransferred: received,
          progress: total > 0 ? Math.min(100, Math.round((received / total) * 100)) : 50,
          speedBytesPerSec: speed,
          etaSeconds: eta,
        });
      }
    }

    const blob = new Blob(chunks as BlobPart[], { type: file.mime_type || 'application/octet-stream' });
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = file.original_file_name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);

    useTransferStore.getState().updateTransfer(transferId, {
      status: 'completed',
      progress: 100,
      bytesTransferred: received,
      speedBytesPerSec: 0,
      etaSeconds: 0,
    });
  } catch (err) {
    const cancelled = controller.signal.aborted;
    useTransferStore.getState().updateTransfer(transferId, {
      status: cancelled ? 'cancelled' : 'failed',
      speedBytesPerSec: 0,
      etaSeconds: null,
      errorMessage: cancelled ? undefined : (err instanceof Error ? err.message : 'Download failed'),
    });
    if (!cancelled) throw err;
  } finally {
    unregisterTransferCancelHandler(transferId);
  }
}

export async function downloadFilesAsZip(files: SharedFile[], roomCode: string): Promise<void> {
  const available = files.filter((f) => f.upload_status === 'available');
  if (available.length === 0) throw new Error('No available files to archive.');

  const zip = new JSZip();
  const usedNames = new Set<string>();

  for (const file of available) {
    const { url, revokeAfter } = await getSessionFileUrl(file);
    try {
      const response = await fetch(url);
      if (!response.ok) continue;
      const blob = await response.blob();
      let entryName = file.original_file_name;
      let counter = 1;
      while (usedNames.has(entryName.toLowerCase())) {
        const dot = file.original_file_name.lastIndexOf('.');
        const base = dot > 0 ? file.original_file_name.slice(0, dot) : file.original_file_name;
        const ext = dot > 0 ? file.original_file_name.slice(dot) : '';
        entryName = `${base} (${counter})${ext}`;
        counter += 1;
      }
      usedNames.add(entryName.toLowerCase());
      zip.file(entryName, blob);
    } finally {
      if (revokeAfter) URL.revokeObjectURL(url);
    }
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const objectUrl = URL.createObjectURL(zipBlob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = `DropBridge-${roomCode}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
}

export async function deleteSharedFile(roomId: string, fileId: string): Promise<void> {
  localSessionFiles.delete(fileId);
  const res = await authedFetch(`/api/rooms/${roomId}/files/${fileId}`, { method: 'DELETE' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Unable to delete file.');
}

import { getRtcIceServers } from '@/src/config/env';

const CHUNK_SIZE = 64 * 1024;
const BUFFER_THRESHOLD = 256 * 1024;

export interface DirectFileHeader {
  transferId: string;
  fileId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  senderMemberId: string;
}

export interface DirectTransferCallbacks {
  onIncomingProgress: (header: DirectFileHeader, bytesReceived: number, speedBps: number) => void;
  onIncomingComplete: (header: DirectFileHeader, blob: Blob) => void;
  onIncomingError: (transferId: string, error: string) => void;
  onPeerStateChange: (peerMemberId: string, state: RTCPeerConnectionState) => void;
}

export interface SignalPayload {
  type: 'offer' | 'answer' | 'ice' | 'cancel';
  fromMemberId: string;
  toMemberId: string;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  transferId?: string;
}

interface IncomingBuffer {
  header: DirectFileHeader;
  chunks: ArrayBuffer[];
  bytesReceived: number;
  startedAt: number;
}

export class DirectTransferManager {
  private sendSignal: (payload: Omit<SignalPayload, 'fromMemberId'>) => void;
  private localMemberId: string;
  private callbacks: DirectTransferCallbacks;
  private peers = new Map<string, RTCPeerConnection>();
  private dataChannels = new Map<string, RTCDataChannel>();
  private incomingTransfers = new Map<string, IncomingBuffer>();
  private activeIncomingIdByPeer = new Map<string, string>();
  private cancelledOutgoing = new Set<string>();

  constructor(
    sendSignal: (payload: Omit<SignalPayload, 'fromMemberId'>) => void,
    localMemberId: string,
    callbacks: DirectTransferCallbacks
  ) {
    this.sendSignal = sendSignal;
    this.localMemberId = localMemberId;
    this.callbacks = callbacks;
  }

  async handleSignal(signal: SignalPayload) {
    if (signal.toMemberId !== this.localMemberId) return;
    const pc = this.getOrCreatePeer(signal.fromMemberId);
    if (signal.type === 'offer' && signal.sdp) {
      await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      this.sendSignal({
        type: 'answer',
        toMemberId: signal.fromMemberId,
        sdp: answer,
      });
    } else if (signal.type === 'answer' && signal.sdp) {
      await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
    } else if (signal.type === 'ice' && signal.candidate) {
      await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
    } else if (signal.type === 'cancel' && signal.transferId) {
      this.incomingTransfers.delete(signal.transferId);
      this.callbacks.onIncomingError(signal.transferId, 'Cancelled by peer');
    }
  }

  private getOrCreatePeer(peerMemberId: string): RTCPeerConnection {
    const existing = this.peers.get(peerMemberId);
    if (existing && existing.connectionState !== 'closed' && existing.connectionState !== 'failed') {
      return existing;
    }

    const pc = new RTCPeerConnection({ iceServers: getRtcIceServers() });
    this.peers.set(peerMemberId, pc);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignal({
          type: 'ice',
          toMemberId: peerMemberId,
          candidate: event.candidate.toJSON(),
        });
      }
    };

    pc.onconnectionstatechange = () => {
      this.callbacks.onPeerStateChange(peerMemberId, pc.connectionState);
      if (pc.connectionState === 'disconnected') {
        try {
          pc.restartIce();
        } catch {
          // Ignore
        }
      }
    };

    pc.ondatachannel = (event) => {
      this.attachDataChannel(peerMemberId, event.channel);
    };

    return pc;
  }

  private attachDataChannel(peerMemberId: string, dc: RTCDataChannel) {
    dc.binaryType = 'arraybuffer';
    this.dataChannels.set(peerMemberId, dc);

    dc.onmessage = (event) => {
      if (typeof event.data === 'string') {
        try {
          const msg = JSON.parse(event.data) as
            | { kind: 'file-start'; header: DirectFileHeader }
            | { kind: 'file-end'; transferId: string }
            | { kind: 'file-cancel'; transferId: string };

          if (msg.kind === 'file-start') {
            this.incomingTransfers.set(msg.header.transferId, {
              header: msg.header,
              chunks: [],
              bytesReceived: 0,
              startedAt: Date.now(),
            });
            this.activeIncomingIdByPeer.set(peerMemberId, msg.header.transferId);
          } else if (msg.kind === 'file-end') {
            const buf = this.incomingTransfers.get(msg.transferId);
            if (buf) {
              const blob = new Blob(buf.chunks, {
                type: buf.header.mimeType || 'application/octet-stream',
              });
              this.incomingTransfers.delete(msg.transferId);
              this.activeIncomingIdByPeer.delete(peerMemberId);
              this.callbacks.onIncomingComplete(buf.header, blob);
            }
          } else if (msg.kind === 'file-cancel') {
            this.incomingTransfers.delete(msg.transferId);
            this.callbacks.onIncomingError(msg.transferId, 'Transfer cancelled by sender');
          }
        } catch {
          // Ignore malformed frame
        }
        return;
      }

      if (event.data instanceof ArrayBuffer) {
        const activeId = this.activeIncomingIdByPeer.get(peerMemberId);
        if (!activeId) return;
        const buf = this.incomingTransfers.get(activeId);
        if (!buf) return;

        buf.chunks.push(event.data);
        buf.bytesReceived += event.data.byteLength;
        const elapsedSec = Math.max(0.1, (Date.now() - buf.startedAt) / 1000);
        this.callbacks.onIncomingProgress(buf.header, buf.bytesReceived, buf.bytesReceived / elapsedSec);
      }
    };
  }

  private async ensureDataChannel(peerMemberId: string): Promise<RTCDataChannel> {
    const existing = this.dataChannels.get(peerMemberId);
    if (existing && existing.readyState === 'open') {
      return existing;
    }

    const pc = this.getOrCreatePeer(peerMemberId);
    const dc = pc.createDataChannel('dropbridge-file-transfer', { ordered: true });
    this.attachDataChannel(peerMemberId, dc);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    this.sendSignal({
      type: 'offer',
      toMemberId: peerMemberId,
      sdp: offer,
    });

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Direct WebRTC peer connection timed out. Use Live Session Relay instead.'));
      }, 15000);

      dc.onopen = () => {
        clearTimeout(timeout);
        resolve();
      };
      dc.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('Direct WebRTC channel failed to open'));
      };
    });

    return dc;
  }

  cancelOutgoing(transferId: string) {
    this.cancelledOutgoing.add(transferId);
  }

  async sendFileToPeer(
    peerMemberId: string,
    file: File,
    transferId: string,
    fileId: string,
    onProgress: (bytesSent: number, speedBps: number, etaSeconds: number | null) => void
  ): Promise<void> {
    const dc = await this.ensureDataChannel(peerMemberId);
    dc.bufferedAmountLowThreshold = BUFFER_THRESHOLD;

    const header: DirectFileHeader = {
      transferId,
      fileId,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type || 'application/octet-stream',
      senderMemberId: this.localMemberId,
    };

    dc.send(JSON.stringify({ kind: 'file-start', header }));

    let offset = 0;
    const startedAt = Date.now();

    while (offset < file.size) {
      if (this.cancelledOutgoing.has(transferId)) {
        this.cancelledOutgoing.delete(transferId);
        dc.send(JSON.stringify({ kind: 'file-cancel', transferId }));
        throw new Error('Transfer cancelled');
      }

      if (dc.bufferedAmount > BUFFER_THRESHOLD * 4) {
        await new Promise<void>((resolve) => {
          const onLow = () => {
            dc.removeEventListener('bufferedamountlow', onLow);
            resolve();
          };
          dc.addEventListener('bufferedamountlow', onLow);
        });
      }

      const slice = file.slice(offset, offset + CHUNK_SIZE);
      const buffer = await slice.arrayBuffer();
      dc.send(buffer);
      offset += buffer.byteLength;

      const elapsedSec = Math.max(0.1, (Date.now() - startedAt) / 1000);
      const speedBps = offset / elapsedSec;
      const remainingBytes = file.size - offset;
      const etaSeconds = speedBps > 0 ? remainingBytes / speedBps : null;
      onProgress(offset, speedBps, etaSeconds);
    }

    dc.send(JSON.stringify({ kind: 'file-end', transferId }));
  }

  destroy() {
    this.dataChannels.forEach((dc) => dc.close());
    this.peers.forEach((pc) => pc.close());
    this.dataChannels.clear();
    this.peers.clear();
    this.incomingTransfers.clear();
    this.activeIncomingIdByPeer.clear();
  }
}

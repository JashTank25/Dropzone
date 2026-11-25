import { create } from 'zustand';
import type { TransferItem, TransferMode } from '@/src/types';

const cancelHandlers = new Map<string, () => void>();

export function registerTransferCancelHandler(transferId: string, handler: () => void): void {
  cancelHandlers.set(transferId, handler);
}

export function unregisterTransferCancelHandler(transferId: string): void {
  cancelHandlers.delete(transferId);
}

interface TransferState {
  transfers: TransferItem[];
  preferredMode: TransferMode;
  targetPeerMemberId: string | null;

  setPreferredMode: (mode: TransferMode) => void;
  setTargetPeerMemberId: (memberId: string | null) => void;
  upsertTransfer: (item: TransferItem) => void;
  updateTransfer: (id: string, patch: Partial<TransferItem>) => void;
  cancelTransfer: (id: string) => void;
  removeTransfer: (id: string) => void;
  clearFinishedTransfers: () => void;
}

export const useTransferStore = create<TransferState>((set) => ({
  transfers: [],
  preferredMode: 'cloud',
  targetPeerMemberId: null,

  setPreferredMode: (preferredMode) => set({ preferredMode }),
  setTargetPeerMemberId: (targetPeerMemberId) => set({ targetPeerMemberId }),

  upsertTransfer: (item) =>
    set((state) => {
      const idx = state.transfers.findIndex((t) => t.id === item.id);
      if (idx >= 0) {
        const next = [...state.transfers];
        next[idx] = item;
        return { transfers: next };
      }
      return { transfers: [item, ...state.transfers] };
    }),

  updateTransfer: (id, patch) =>
    set((state) => ({
      transfers: state.transfers.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    })),

  cancelTransfer: (id) => {
    const handler = cancelHandlers.get(id);
    if (handler) {
      handler();
      cancelHandlers.delete(id);
    }
    set((state) => ({
      transfers: state.transfers.map((t) =>
        t.id === id ? { ...t, status: 'cancelled', speedBytesPerSec: 0, etaSeconds: null } : t
      ),
    }));
  },

  removeTransfer: (id) => {
    cancelHandlers.delete(id);
    set((state) => ({
      transfers: state.transfers.filter((t) => t.id !== id),
    }));
  },

  clearFinishedTransfers: () =>
    set((state) => ({
      transfers: state.transfers.filter((t) => t.status === 'queued' || t.status === 'transferring'),
    })),
}));

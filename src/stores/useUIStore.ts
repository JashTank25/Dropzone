import { create } from 'zustand';
import type { FileCategory } from '@/src/types';

export type FileViewMode = 'table' | 'grid';
export type FileSortBy = 'date' | 'name' | 'size' | 'sender';
export type MobileTab = 'files' | 'transfers' | 'chat' | 'devices';

interface UIState {
  viewMode: FileViewMode;
  activeCategory: FileCategory;
  sortBy: FileSortBy;
  sortDir: 'asc' | 'desc';
  searchQuery: string;
  selectedFileIds: string[];
  isChatOpen: boolean;
  mobileTab: MobileTab;
  previewFileId: string | null;
  detailsFileId: string | null;
  isSettingsOpen: boolean;
  isQRDialogOpen: boolean;

  setViewMode: (mode: FileViewMode) => void;
  setActiveCategory: (category: FileCategory) => void;
  setSort: (sortBy: FileSortBy, sortDir?: 'asc' | 'desc') => void;
  setSearchQuery: (q: string) => void;
  toggleFileSelection: (fileId: string) => void;
  selectAllFiles: (fileIds: string[]) => void;
  clearFileSelection: () => void;
  setChatOpen: (open: boolean) => void;
  setMobileTab: (tab: MobileTab) => void;
  setPreviewFileId: (fileId: string | null) => void;
  setDetailsFileId: (fileId: string | null) => void;
  setSettingsOpen: (open: boolean) => void;
  setQRDialogOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  viewMode: 'table',
  activeCategory: 'all',
  sortBy: 'date',
  sortDir: 'desc',
  searchQuery: '',
  selectedFileIds: [],
  isChatOpen: true,
  mobileTab: 'files',
  previewFileId: null,
  detailsFileId: null,
  isSettingsOpen: false,
  isQRDialogOpen: false,

  setViewMode: (viewMode) => set({ viewMode }),
  setActiveCategory: (activeCategory) => set({ activeCategory }),
  setSort: (sortBy, sortDir) =>
    set((state) => ({
      sortBy,
      sortDir: sortDir ?? (state.sortBy === sortBy && state.sortDir === 'desc' ? 'asc' : 'desc'),
    })),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  toggleFileSelection: (fileId) =>
    set((state) => ({
      selectedFileIds: state.selectedFileIds.includes(fileId)
        ? state.selectedFileIds.filter((id) => id !== fileId)
        : [...state.selectedFileIds, fileId],
    })),
  selectAllFiles: (fileIds) => set({ selectedFileIds: fileIds }),
  clearFileSelection: () => set({ selectedFileIds: [] }),
  setChatOpen: (isChatOpen) => set({ isChatOpen }),
  setMobileTab: (mobileTab) => set({ mobileTab }),
  setPreviewFileId: (previewFileId) => set({ previewFileId }),
  setDetailsFileId: (detailsFileId) => set({ detailsFileId }),
  setSettingsOpen: (isSettingsOpen) => set({ isSettingsOpen }),
  setQRDialogOpen: (isQRDialogOpen) => set({ isQRDialogOpen }),
}));

import { create } from 'zustand';
import type {
  Room,
  RoomJoinRequest,
  RoomMember,
  RoomMessage,
  RoomTerminalError,
  SharedFile,
} from '@/src/types';

export type RealtimeConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

interface RoomState {
  room: Room | null;
  currentMember: RoomMember | null;
  members: RoomMember[];
  onlineMemberIds: string[];
  files: SharedFile[];
  directFileBlobs: Record<string, { url: string; fileName: string; mimeType: string }>;
  messages: RoomMessage[];
  joinRequests: RoomJoinRequest[];
  typingMemberIds: Record<string, number>;
  realtimeStatus: RealtimeConnectionState;
  terminalError: RoomTerminalError;
  unreadMessagesCount: number;
  isLoadingRoom: boolean;

  setLoadingRoom: (loading: boolean) => void;
  setTerminalError: (error: RoomTerminalError) => void;
  setRealtimeStatus: (status: RealtimeConnectionState) => void;
  setRoomSnapshot: (payload: {
    room: Room;
    currentMember: RoomMember;
    members: RoomMember[];
    files: SharedFile[];
    messages: RoomMessage[];
    joinRequests: RoomJoinRequest[];
  }) => void;
  updateRoom: (room: Room) => void;
  upsertMember: (member: RoomMember) => void;
  upsertFile: (file: SharedFile) => void;
  removeFile: (fileId: string) => void;
  registerDirectBlob: (fileId: string, url: string, fileName: string, mimeType: string) => void;
  addMessage: (message: RoomMessage, isChatVisible: boolean) => void;
  markMessageDeleted: (messageId: string) => void;
  upsertJoinRequest: (req: RoomJoinRequest) => void;
  setOnlineMemberIds: (memberIds: string[]) => void;
  setMemberTyping: (memberId: string, isTyping: boolean) => void;
  clearUnreadMessages: () => void;
  resetRoom: () => void;
}

export const useRoomStore = create<RoomState>((set, get) => ({
  room: null,
  currentMember: null,
  members: [],
  onlineMemberIds: [],
  files: [],
  directFileBlobs: {},
  messages: [],
  joinRequests: [],
  typingMemberIds: {},
  realtimeStatus: 'disconnected',
  terminalError: null,
  unreadMessagesCount: 0,
  isLoadingRoom: false,

  setLoadingRoom: (isLoadingRoom) => set({ isLoadingRoom }),
  setTerminalError: (terminalError) => set({ terminalError }),
  setRealtimeStatus: (realtimeStatus) => set({ realtimeStatus }),

  setRoomSnapshot: ({ room, currentMember, members, files, messages, joinRequests }) =>
    set({
      room,
      currentMember,
      members,
      files: files.filter((f) => !f.deleted_at),
      messages: messages.filter((m) => !m.deleted_at),
      joinRequests,
      terminalError: null,
      isLoadingRoom: false,
    }),

  updateRoom: (room) =>
    set((state) => {
      if (room.status === 'ended') {
        return { room, terminalError: { type: 'ended', message: 'This room was ended by the host.' } };
      }
      if (room.status === 'expired' || new Date(room.expires_at).getTime() <= Date.now()) {
        return { room, terminalError: { type: 'expired', message: 'This room has expired.' } };
      }
      return { room };
    }),

  upsertMember: (member) =>
    set((state) => {
      const idx = state.members.findIndex((m) => m.id === member.id);
      const nextMembers =
        idx >= 0
          ? state.members.map((m) => (m.id === member.id ? member : m))
          : [...state.members, member];

      let nextCurrent = state.currentMember;
      let nextError = state.terminalError;
      if (state.currentMember && state.currentMember.id === member.id) {
        nextCurrent = member;
        if (member.membership_status === 'removed') {
          nextError = { type: 'removed', message: 'You were removed from this room by the host.' };
        } else if (member.membership_status === 'rejected') {
          nextError = { type: 'rejected', message: 'Your request to join this room was declined.' };
        }
      }

      return {
        members: nextMembers,
        currentMember: nextCurrent,
        terminalError: nextError,
      };
    }),

  upsertFile: (file) =>
    set((state) => {
      if (file.deleted_at) {
        return { files: state.files.filter((f) => f.id !== file.id) };
      }
      const idx = state.files.findIndex((f) => f.id === file.id);
      if (idx >= 0) {
        const updated = [...state.files];
        updated[idx] = file;
        return { files: updated };
      }
      return { files: [file, ...state.files] };
    }),

  removeFile: (fileId) =>
    set((state) => {
      const blobEntry = state.directFileBlobs[fileId];
      if (blobEntry) {
        URL.revokeObjectURL(blobEntry.url);
      }
      const nextBlobs = { ...state.directFileBlobs };
      delete nextBlobs[fileId];
      return {
        files: state.files.filter((f) => f.id !== fileId),
        directFileBlobs: nextBlobs,
      };
    }),

  registerDirectBlob: (fileId, url, fileName, mimeType) =>
    set((state) => ({
      directFileBlobs: {
        ...state.directFileBlobs,
        [fileId]: { url, fileName, mimeType },
      },
    })),

  addMessage: (message, isChatVisible) =>
    set((state) => {
      if (message.deleted_at) return state;
      if (state.messages.some((m) => m.id === message.id)) return state;
      const isOwn = state.currentMember?.id === message.sender_member_id;
      return {
        messages: [...state.messages, message],
        unreadMessagesCount:
          !isChatVisible && !isOwn && message.message_type !== 'system'
            ? state.unreadMessagesCount + 1
            : state.unreadMessagesCount,
      };
    }),

  markMessageDeleted: (messageId) =>
    set((state) => ({
      messages: state.messages.filter((m) => m.id !== messageId),
    })),

  upsertJoinRequest: (req) =>
    set((state) => {
      const idx = state.joinRequests.findIndex((r) => r.id === req.id);
      if (idx >= 0) {
        const next = [...state.joinRequests];
        next[idx] = req;
        return { joinRequests: next };
      }
      return { joinRequests: [req, ...state.joinRequests] };
    }),

  setOnlineMemberIds: (onlineMemberIds) => set({ onlineMemberIds }),

  setMemberTyping: (memberId, isTyping) =>
    set((state) => {
      const next = { ...state.typingMemberIds };
      if (isTyping) {
        next[memberId] = Date.now();
      } else {
        delete next[memberId];
      }
      return { typingMemberIds: next };
    }),

  clearUnreadMessages: () => set({ unreadMessagesCount: 0 }),

  resetRoom: () => {
    const blobs = get().directFileBlobs;
    Object.values(blobs).forEach((b) => URL.revokeObjectURL(b.url));
    set({
      room: null,
      currentMember: null,
      members: [],
      onlineMemberIds: [],
      files: [],
      directFileBlobs: {},
      messages: [],
      joinRequests: [],
      typingMemberIds: {},
      realtimeStatus: 'disconnected',
      terminalError: null,
      unreadMessagesCount: 0,
      isLoadingRoom: false,
    });
  },
}));

import { envConfig } from '@/src/config/env';
import { authedFetch } from '@/src/services/authService';
import { clearLocalSessionFiles } from '@/src/services/fileService';
import { useSessionStore } from '@/src/stores/useSessionStore';
import type { Room, RoomJoinRequest, RoomMember, RoomMessage, SharedFile } from '@/src/types';

export interface CreateRoomParams {
  roomName: string;
  durationMinutes: number;
  password?: string;
  displayName: string;
}

export interface CreateRoomResult {
  room_id: string;
  room_code: string;
  member_id: string;
  expires_at: string;
  has_password: boolean;
}

export type JoinRoomResult =
  | { status: 'joined'; room_id: string; room_code: string; member_id: string; role: 'host' | 'member' }
  | { status: 'pending_approval'; room_id: string; room_code: string; room_name: string; member_id: string; request_id: string }
  | { status: 'password_required'; room_name: string; message: string }
  | {
      status: 'invalid_code' | 'not_found' | 'expired' | 'ended' | 'locked' | 'invalid_password' | 'full' | 'rejected' | 'rate_limited';
      message: string;
    };

export async function createRoom(params: CreateRoomParams): Promise<CreateRoomResult> {
  const { deviceInfo } = useSessionStore.getState();
  const res = await authedFetch('/api/rooms', {
    method: 'POST',
    body: JSON.stringify({
      roomName: params.roomName,
      durationMinutes: params.durationMinutes,
      password: params.password || '',
      deviceId: deviceInfo.deviceId,
      displayName: params.displayName,
      deviceType: deviceInfo.deviceType,
      browser: deviceInfo.browser,
      operatingSystem: deviceInfo.operatingSystem,
      maxFileSizeBytes: envConfig.maxFileSizeBytes,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Unable to create room.');
  return data as CreateRoomResult;
}

export async function joinRoom(params: {
  roomCode: string;
  password?: string;
  displayName: string;
}): Promise<JoinRoomResult> {
  const { deviceInfo } = useSessionStore.getState();
  const res = await authedFetch('/api/rooms/join', {
    method: 'POST',
    body: JSON.stringify({
      roomCode: params.roomCode,
      password: params.password || '',
      deviceId: deviceInfo.deviceId,
      displayName: params.displayName,
      deviceType: deviceInfo.deviceType,
      browser: deviceInfo.browser,
      operatingSystem: deviceInfo.operatingSystem,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Unable to join room.');
  return data as JoinRoomResult;
}

export async function fetchRoomSnapshot(roomId: string): Promise<{
  room: Room;
  currentMember: RoomMember;
  members: RoomMember[];
  files: SharedFile[];
  messages: RoomMessage[];
  joinRequests: RoomJoinRequest[];
}> {
  const res = await authedFetch(`/api/rooms/${roomId}/snapshot`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Unable to load room.');
  return data;
}

export async function updateRoomSettings(
  roomId: string,
  settings: {
    roomName?: string;
    isLocked?: boolean;
    requireApproval?: boolean;
    allowChat?: boolean;
    allowUpload?: boolean;
    allowDownload?: boolean;
    maxDevices?: number;
    autoDeleteFiles?: boolean;
    extendMinutes?: number;
    newPassword?: string;
    clearPassword?: boolean;
  }
): Promise<void> {
  const res = await authedFetch(`/api/rooms/${roomId}/settings`, {
    method: 'PATCH',
    body: JSON.stringify(settings),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Unable to update settings.');
}

export async function reviewJoinRequest(
  roomId: string,
  requestId: string,
  decision: 'approved' | 'rejected'
): Promise<void> {
  const res = await authedFetch(`/api/rooms/${roomId}/join-requests/${requestId}`, {
    method: 'POST',
    body: JSON.stringify({ decision }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Unable to review join request.');
}

export async function removeRoomMember(roomId: string, targetMemberId: string): Promise<void> {
  const res = await authedFetch(`/api/rooms/${roomId}/members/${targetMemberId}/remove`, {
    method: 'POST',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Unable to remove device.');
}

export async function transferHostOwnership(roomId: string, newHostMemberId: string): Promise<void> {
  const res = await authedFetch(`/api/rooms/${roomId}/transfer-host`, {
    method: 'POST',
    body: JSON.stringify({ newHostMemberId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Unable to transfer host.');
}

export async function endRoom(roomId: string): Promise<void> {
  const res = await authedFetch(`/api/rooms/${roomId}/end`, { method: 'POST' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Unable to end room.');
  clearLocalSessionFiles();
}

export async function leaveRoom(roomId: string): Promise<void> {
  clearLocalSessionFiles();
  await authedFetch(`/api/rooms/${roomId}/leave`, { method: 'POST' }).catch(() => {});
}

export type DeviceType = 'mobile' | 'tablet' | 'desktop' | 'unknown';
export type MemberRole = 'host' | 'member';
export type MembershipStatus = 'active' | 'pending' | 'removed' | 'left' | 'rejected';
export type RoomStatus = 'active' | 'expired' | 'ended';
export type TransferMode = 'cloud' | 'webrtc';
export type FileUploadStatus = 'uploading' | 'available' | 'failed' | 'cancelled';
export type MessageType = 'text' | 'system' | 'code' | 'link';
export type FileCategory =
  | 'all'
  | 'documents'
  | 'spreadsheets'
  | 'presentations'
  | 'images'
  | 'videos'
  | 'audio'
  | 'archives'
  | 'others';

export interface Room {
  id: string;
  room_code: string;
  room_name: string;
  host_user_id: string;
  has_password: boolean;
  is_locked: boolean;
  require_approval: boolean;
  allow_chat: boolean;
  allow_upload: boolean;
  allow_download: boolean;
  max_devices: number;
  max_file_size_bytes: number;
  max_room_storage_bytes: number;
  auto_delete_files: boolean;
  expires_at: string;
  status: RoomStatus;
  created_at: string;
  updated_at: string;
}

export interface RoomMember {
  id: string;
  room_id: string;
  user_id: string;
  device_id: string;
  display_name: string;
  device_type: DeviceType;
  browser: string;
  operating_system: string;
  role: MemberRole;
  membership_status: MembershipStatus;
  joined_at: string;
  last_seen_at: string;
  left_at: string | null;
}

export interface SharedFile {
  id: string;
  room_id: string;
  uploaded_by: string;
  original_file_name: string;
  storage_path: string;
  mime_type: string;
  file_extension: string;
  file_size: number;
  transfer_mode: TransferMode;
  upload_status: FileUploadStatus;
  checksum: string | null;
  created_at: string;
  expires_at: string;
  deleted_at: string | null;
}

export interface RoomMessage {
  id: string;
  room_id: string;
  sender_member_id: string | null;
  message_type: MessageType;
  message_content: string;
  created_at: string;
  deleted_at: string | null;
}

export interface RoomJoinRequest {
  id: string;
  room_id: string;
  requested_by: string;
  device_id: string;
  device_name: string;
  device_type: DeviceType;
  browser: string;
  operating_system: string;
  request_status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  created_at: string;
  reviewed_at: string | null;
}

export interface TransferItem {
  id: string;
  fileId?: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  direction: 'upload' | 'download';
  mode: TransferMode;
  status: 'queued' | 'transferring' | 'completed' | 'failed' | 'cancelled';
  bytesTransferred: number;
  progress: number;
  speedBytesPerSec: number;
  etaSeconds: number | null;
  errorMessage?: string;
  peerName?: string;
  startedAt: number;
  retryFile?: File;
}

export type AppRoute =
  | { view: 'landing' }
  | { view: 'room'; roomCode: string }
  | { view: 'privacy' }
  | { view: 'help' }
  | { view: 'not-found' };

export type RoomTerminalError =
  | null
  | { type: 'expired'; message: string }
  | { type: 'ended'; message: string }
  | { type: 'not_found'; message: string }
  | { type: 'locked'; message: string }
  | { type: 'rejected'; message: string }
  | { type: 'removed'; message: string }
  | { type: 'connection_lost'; message: string }
  | { type: 'pending_approval'; roomName: string; requestId: string; roomId: string; memberId?: string };

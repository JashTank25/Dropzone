import 'dotenv/config';
import express, { type Request, type Response, type NextFunction } from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { WebSocketServer, WebSocket } from 'ws';
import type {
  Room,
  RoomJoinRequest,
  RoomMember,
  RoomMessage,
  SharedFile,
} from './src/types/index.ts';

const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';
const SESSION_SECRET = crypto.randomBytes(32);

interface StoredRoom {
  meta: Omit<Room, 'has_password'> & {
    password_salt: string | null;
    password_hash: string | null;
  };
  members: Map<string, RoomMember>;
  files: Map<string, SharedFile>;
  messages: RoomMessage[];
  joinRequests: Map<string, RoomJoinRequest>;
  sockets: Map<string, WebSocket>; // memberId -> ws
  lastActivityAt: number;
}

interface PendingStream {
  streamId: string;
  roomId: string;
  fileId: string;
  senderMemberId: string;
  receiverRes: Response;
  timeoutId: ReturnType<typeof setTimeout>;
  started: boolean;
}

interface StreamTokenEntry {
  roomId: string;
  fileId: string;
  memberId: string;
  expiresAt: number;
}

// Strictly ephemeral in-memory session state — zero disk or database storage
const rooms = new Map<string, StoredRoom>();
const codeToRoomId = new Map<string, string>();
const joinAttempts = new Map<string, { failures: number; windowStart: number }>();
const pendingStreams = new Map<string, PendingStream>();
const streamTokens = new Map<string, StreamTokenEntry>();

function sanitizeFileName(raw: string): string {
  const cleaned = String(raw || 'file')
    .replace(/[\\/:*?"<>|\x00-\x1f]/g, '_')
    .replace(/\.{2,}/g, '.')
    .trim()
    .replace(/^[.\s]+|[.\s]+$/g, '');
  return cleaned ? cleaned.slice(0, 240) : 'untitled_file';
}

function hashPassword(password: string): { salt: string; hash: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  const derived = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHash, 'hex');
  if (derived.length !== expected.length) return false;
  return crypto.timingSafeEqual(derived, expected);
}

function signSessionToken(userId: string): string {
  const payload = Buffer.from(
    JSON.stringify({ uid: userId, iat: Date.now() })
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifySessionToken(token: string): string | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expected = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { uid?: string };
    return typeof parsed.uid === 'string' ? parsed.uid : null;
  } catch {
    return null;
  }
}

function generateUniqueRoomCode(): string {
  for (let i = 0; i < 60; i++) {
    const num = crypto.randomInt(100000, 1000000);
    const code = String(num);
    const existingId = codeToRoomId.get(code);
    const existing = existingId ? rooms.get(existingId) : undefined;
    if (!existing || existing.meta.status !== 'active') {
      return code;
    }
  }
  throw new Error('Unable to allocate unique room code');
}

function toPublicRoom(room: StoredRoom): Room {
  const { password_hash, password_salt, ...rest } = room.meta;
  return {
    ...rest,
    has_password: Boolean(password_hash && password_salt),
  };
}

function broadcastToRoom(room: StoredRoom, event: string, data: unknown, excludeMemberId?: string) {
  const payload = JSON.stringify({ event, data });
  room.sockets.forEach((ws, mId) => {
    if (excludeMemberId && mId === excludeMemberId) return;
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  });
}

function sendToMember(room: StoredRoom, memberId: string, event: string, data: unknown): boolean {
  const ws = room.sockets.get(memberId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ event, data }));
    return true;
  }
  return false;
}

function pushPresence(room: StoredRoom) {
  const onlineMemberIds: string[] = [];
  room.sockets.forEach((ws, memberId) => {
    if (ws.readyState === WebSocket.OPEN) {
      onlineMemberIds.push(memberId);
    }
  });
  broadcastToRoom(room, 'presence:sync', { onlineMemberIds });
}

function addSystemMessage(room: StoredRoom, content: string, senderMemberId: string | null = null) {
  const msg: RoomMessage = {
    id: crypto.randomUUID(),
    room_id: room.meta.id,
    sender_member_id: senderMemberId,
    message_type: 'system',
    message_content: content,
    created_at: new Date().toISOString(),
    deleted_at: null,
  };
  room.messages.push(msg);
  if (room.messages.length > 500) {
    room.messages.shift();
  }
  broadcastToRoom(room, 'message:added', msg);
}

function expireAndPurgeRoom(room: StoredRoom, reason: 'expired' | 'ended') {
  room.meta.status = reason;
  room.meta.updated_at = new Date().toISOString();
  room.files.clear();
  room.messages = [];
  room.joinRequests.clear();
  broadcastToRoom(room, 'room:updated', toPublicRoom(room));
  room.sockets.forEach((ws) => {
    try {
      ws.close(1000, reason);
    } catch {
      // ignore
    }
  });
  room.sockets.clear();
  if (codeToRoomId.get(room.meta.room_code) === room.meta.id) {
    codeToRoomId.delete(room.meta.room_code);
  }
  rooms.delete(room.meta.id);
}

// Background sweep every 15s for expired rooms and stale stream tokens
setInterval(() => {
  const now = Date.now();
  rooms.forEach((room) => {
    if (new Date(room.meta.expires_at).getTime() <= now) {
      expireAndPurgeRoom(room, 'expired');
    } else if (room.sockets.size === 0 && now - room.lastActivityAt > 5 * 60 * 1000) {
      // Clean up abandoned single-session rooms after 5 min of zero connected devices
      expireAndPurgeRoom(room, 'expired');
    }
  });
  streamTokens.forEach((entry, tok) => {
    if (entry.expiresAt <= now) {
      streamTokens.delete(tok);
    }
  });
  joinAttempts.forEach((entry, key) => {
    if (now - entry.windowStart > 5 * 60 * 1000) {
      joinAttempts.delete(key);
    }
  });
}, 15_000);

interface AuthedRequest extends Request {
  userId?: string;
}

function requireSession(req: AuthedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Session token required' });
    return;
  }
  const uid = verifySessionToken(authHeader.slice(7));
  if (!uid) {
    res.status(401).json({ error: 'Invalid or expired session token' });
    return;
  }
  req.userId = uid;
  next();
}

function getActiveMember(room: StoredRoom, userId: string): RoomMember | null {
  for (const member of room.members.values()) {
    if (member.user_id === userId && member.membership_status === 'active') {
      return member;
    }
  }
  return null;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  // WebSocket real-time hub
  wss.on('connection', (ws, req) => {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const token = url.searchParams.get('token') || '';
    const roomId = url.searchParams.get('roomId') || '';
    const memberId = url.searchParams.get('memberId') || '';
    const userId = verifySessionToken(token);

    if (!userId || !roomId || !memberId) {
      ws.close(4001, 'Unauthorized');
      return;
    }

    const room = rooms.get(roomId);
    if (!room || room.meta.status !== 'active' || new Date(room.meta.expires_at).getTime() <= Date.now()) {
      ws.close(4004, 'Room unavailable');
      return;
    }

    const member = room.members.get(memberId);
    const isPendingJoiner = member && member.user_id === userId && member.membership_status === 'pending';
    const isActiveMember = member && member.user_id === userId && member.membership_status === 'active';

    if (!isActiveMember && !isPendingJoiner) {
      ws.close(4003, 'Forbidden');
      return;
    }

    room.sockets.set(memberId, ws);
    room.lastActivityAt = Date.now();
    if (isActiveMember) {
      member.last_seen_at = new Date().toISOString();
      pushPresence(room);
    }

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as { event: string; data?: Record<string, unknown> };
        room.lastActivityAt = Date.now();
        if (member.membership_status !== 'active') return;

        if (msg.event === 'typing' && msg.data) {
          broadcastToRoom(
            room,
            'typing',
            { memberId, isTyping: Boolean(msg.data.isTyping) },
            memberId
          );
        } else if (msg.event === 'webrtc-signal' && msg.data) {
          const toMemberId = String(msg.data.toMemberId || '');
          if (toMemberId) {
            sendToMember(room, toMemberId, 'webrtc-signal', {
              ...msg.data,
              fromMemberId: memberId,
            });
          }
        } else if (msg.event === 'heartbeat') {
          member.last_seen_at = new Date().toISOString();
        }
      } catch {
        // Ignore malformed messages
      }
    });

    ws.on('close', () => {
      if (room.sockets.get(memberId) === ws) {
        room.sockets.delete(memberId);
        pushPresence(room);
      }
    });
  });

  // 1. Ephemeral anonymous session issuance
  app.post('/api/session', (_req, res) => {
    const userId = crypto.randomUUID();
    const token = signSessionToken(userId);
    res.json({ userId, token });
  });

  // 2. Create room
  app.post('/api/rooms', requireSession, (req: AuthedRequest, res) => {
    const userId = req.userId!;
    const {
      roomName = 'DropBridge Room',
      durationMinutes = 60,
      password = '',
      deviceId = crypto.randomUUID(),
      displayName = 'Host Device',
      deviceType = 'desktop',
      browser = 'Browser',
      operatingSystem = 'OS',
      maxFileSizeBytes = 250 * 1024 * 1024,
    } = req.body || {};

    const validDurations = new Set([15, 30, 60, 360, 1440]);
    const mins = validDurations.has(Number(durationMinutes)) ? Number(durationMinutes) : 60;
    const roomId = crypto.randomUUID();
    const roomCode = generateUniqueRoomCode();
    const nowIso = new Date().toISOString();
    const expiresAt = new Date(Date.now() + mins * 60 * 1000).toISOString();

    const cleanRoomName = String(roomName || 'DropBridge Room').trim().slice(0, 80) || 'DropBridge Room';
    const cleanDisplayName = String(displayName || 'Host Device').trim().slice(0, 64) || 'Host Device';
    const trimmedPassword = typeof password === 'string' ? password.trim() : '';
    const pw = trimmedPassword ? hashPassword(trimmedPassword) : null;

    const memberId = crypto.randomUUID();
    const hostMember: RoomMember = {
      id: memberId,
      room_id: roomId,
      user_id: userId,
      device_id: String(deviceId),
      display_name: cleanDisplayName,
      device_type: deviceType,
      browser: String(browser).slice(0, 48),
      operating_system: String(operatingSystem).slice(0, 48),
      role: 'host',
      membership_status: 'active',
      joined_at: nowIso,
      last_seen_at: nowIso,
      left_at: null,
    };

    const stored: StoredRoom = {
      meta: {
        id: roomId,
        room_code: roomCode,
        room_name: cleanRoomName,
        host_user_id: userId,
        password_salt: pw?.salt ?? null,
        password_hash: pw?.hash ?? null,
        is_locked: false,
        require_approval: false,
        allow_chat: true,
        allow_upload: true,
        allow_download: true,
        max_devices: 25,
        max_file_size_bytes: Math.max(1024 * 1024, Number(maxFileSizeBytes) || 250 * 1024 * 1024),
        max_room_storage_bytes: 0, // Zero server storage used
        auto_delete_files: true,
        expires_at: expiresAt,
        status: 'active',
        created_at: nowIso,
        updated_at: nowIso,
      },
      members: new Map([[memberId, hostMember]]),
      files: new Map(),
      messages: [],
      joinRequests: new Map(),
      sockets: new Map(),
      lastActivityAt: Date.now(),
    };

    rooms.set(roomId, stored);
    codeToRoomId.set(roomCode, roomId);
    addSystemMessage(stored, `${cleanDisplayName} created the session room.`, memberId);

    res.json({
      room_id: roomId,
      room_code: roomCode,
      member_id: memberId,
      expires_at: expiresAt,
      has_password: Boolean(pw),
    });
  });

  // 3. Join room with rate limiting & password verification
  app.post('/api/rooms/join', requireSession, (req: AuthedRequest, res) => {
    const userId = req.userId!;
    const {
      roomCode = '',
      password = '',
      deviceId = crypto.randomUUID(),
      displayName = 'Guest Device',
      deviceType = 'desktop',
      browser = 'Browser',
      operatingSystem = 'OS',
    } = req.body || {};

    const code = String(roomCode).trim();
    if (!/^\d{6}$/.test(code)) {
      res.json({ status: 'invalid_code', message: 'Enter a valid 6-digit numeric room code.' });
      return;
    }

    const rateKey = req.ip || userId;
    const now = Date.now();
    const attempt = joinAttempts.get(rateKey);
    if (attempt && now - attempt.windowStart < 5 * 60 * 1000 && attempt.failures >= 10) {
      res.json({
        status: 'rate_limited',
        message: 'Too many join attempts. Please wait a few minutes before trying again.',
      });
      return;
    }

    const recordFailure = () => {
      const current = joinAttempts.get(rateKey);
      if (!current || now - current.windowStart >= 5 * 60 * 1000) {
        joinAttempts.set(rateKey, { failures: 1, windowStart: now });
      } else {
        current.failures += 1;
      }
    };

    const roomId = codeToRoomId.get(code);
    const room = roomId ? rooms.get(roomId) : undefined;
    if (!room) {
      recordFailure();
      res.json({ status: 'not_found', message: 'No active session matches that 6-digit code.' });
      return;
    }

    if (room.meta.status === 'ended') {
      res.json({ status: 'ended', message: 'This session was ended by the host.' });
      return;
    }
    if (room.meta.status === 'expired' || new Date(room.meta.expires_at).getTime() <= now) {
      expireAndPurgeRoom(room, 'expired');
      res.json({ status: 'expired', message: 'This session has expired.' });
      return;
    }

    const cleanName = String(displayName || 'Guest Device').trim().slice(0, 64) || 'Guest Device';

    // Rejoin check for same user/device
    let existing: RoomMember | undefined;
    for (const m of room.members.values()) {
      if (m.user_id === userId && m.device_id === deviceId) {
        existing = m;
        break;
      }
    }

    if (existing) {
      if (existing.membership_status === 'removed' || existing.membership_status === 'rejected') {
        res.json({ status: 'rejected', message: 'Access to this room was declined by the host.' });
        return;
      }
      if (existing.membership_status === 'active') {
        existing.display_name = cleanName;
        existing.last_seen_at = new Date().toISOString();
        broadcastToRoom(room, 'member:updated', existing);
        res.json({
          status: 'joined',
          room_id: room.meta.id,
          room_code: room.meta.room_code,
          member_id: existing.id,
          role: existing.role,
        });
        return;
      }
    }

    if (room.meta.is_locked) {
      res.json({ status: 'locked', message: 'This room is locked by the host.' });
      return;
    }

    if (room.meta.password_hash && room.meta.password_salt) {
      const pwInput = typeof password === 'string' ? password : '';
      if (!pwInput) {
        res.json({
          status: 'password_required',
          room_name: room.meta.room_name,
          message: 'This room requires a password.',
        });
        return;
      }
      if (!verifyPassword(pwInput, room.meta.password_salt, room.meta.password_hash)) {
        recordFailure();
        res.json({ status: 'invalid_password', message: 'Incorrect room password.' });
        return;
      }
    }

    const activeCount = Array.from(room.members.values()).filter(
      (m) => m.membership_status === 'active'
    ).length;
    if (activeCount >= room.meta.max_devices) {
      res.json({ status: 'full', message: 'This room has reached its maximum device capacity.' });
      return;
    }

    const nowIso = new Date().toISOString();
    const memberId = existing?.id || crypto.randomUUID();

    if (room.meta.require_approval) {
      const pendingMember: RoomMember = {
        id: memberId,
        room_id: room.meta.id,
        user_id: userId,
        device_id: String(deviceId),
        display_name: cleanName,
        device_type: deviceType,
        browser: String(browser).slice(0, 48),
        operating_system: String(operatingSystem).slice(0, 48),
        role: 'member',
        membership_status: 'pending',
        joined_at: nowIso,
        last_seen_at: nowIso,
        left_at: null,
      };
      room.members.set(memberId, pendingMember);

      const joinReq: RoomJoinRequest = {
        id: crypto.randomUUID(),
        room_id: room.meta.id,
        requested_by: userId,
        device_id: String(deviceId),
        device_name: cleanName,
        device_type: deviceType,
        browser: String(browser).slice(0, 48),
        operating_system: String(operatingSystem).slice(0, 48),
        request_status: 'pending',
        reviewed_by: null,
        created_at: nowIso,
        reviewed_at: null,
      };
      room.joinRequests.set(joinReq.id, joinReq);
      broadcastToRoom(room, 'join-request:updated', joinReq);

      res.json({
        status: 'pending_approval',
        room_id: room.meta.id,
        room_code: room.meta.room_code,
        room_name: room.meta.room_name,
        member_id: memberId,
        request_id: joinReq.id,
      });
      return;
    }

    const activeMember: RoomMember = {
      id: memberId,
      room_id: room.meta.id,
      user_id: userId,
      device_id: String(deviceId),
      display_name: cleanName,
      device_type: deviceType,
      browser: String(browser).slice(0, 48),
      operating_system: String(operatingSystem).slice(0, 48),
      role: 'member',
      membership_status: 'active',
      joined_at: nowIso,
      last_seen_at: nowIso,
      left_at: null,
    };
    room.members.set(memberId, activeMember);
    room.lastActivityAt = now;
    broadcastToRoom(room, 'member:updated', activeMember);
    addSystemMessage(room, `${cleanName} joined the room.`, memberId);

    res.json({
      status: 'joined',
      room_id: room.meta.id,
      room_code: room.meta.room_code,
      member_id: memberId,
      role: 'member',
    });
  });

  // 4. Room Snapshot
  app.get('/api/rooms/:roomId/snapshot', requireSession, (req: AuthedRequest, res) => {
    const room = rooms.get(String(req.params.roomId));
    if (!room || room.meta.status !== 'active') {
      res.status(404).json({ error: 'Room not found or ended' });
      return;
    }
    const currentMember = getActiveMember(room, req.userId!);
    if (!currentMember) {
      res.status(403).json({ error: 'Not an active member of this room' });
      return;
    }

    res.json({
      room: toPublicRoom(room),
      currentMember,
      members: Array.from(room.members.values()).filter((m) => m.membership_status === 'active'),
      files: Array.from(room.files.values()).filter((f) => !f.deleted_at),
      messages: room.messages.filter((m) => !m.deleted_at),
      joinRequests:
        currentMember.role === 'host'
          ? Array.from(room.joinRequests.values()).filter((r) => r.request_status === 'pending')
          : [],
    });
  });

  // 5. Update Room Settings (Host only)
  app.patch('/api/rooms/:roomId/settings', requireSession, (req: AuthedRequest, res) => {
    const room = rooms.get(String(req.params.roomId));
    if (!room || room.meta.status !== 'active') {
      res.status(404).json({ error: 'Room not found' });
      return;
    }
    const actor = getActiveMember(room, req.userId!);
    if (!actor || actor.role !== 'host') {
      res.status(403).json({ error: 'Only the room host can update settings' });
      return;
    }

    const body = req.body || {};
    if (typeof body.roomName === 'string' && body.roomName.trim()) {
      room.meta.room_name = body.roomName.trim().slice(0, 80);
    }
    if (typeof body.isLocked === 'boolean') room.meta.is_locked = body.isLocked;
    if (typeof body.requireApproval === 'boolean') room.meta.require_approval = body.requireApproval;
    if (typeof body.allowChat === 'boolean') room.meta.allow_chat = body.allowChat;
    if (typeof body.allowUpload === 'boolean') room.meta.allow_upload = body.allowUpload;
    if (typeof body.allowDownload === 'boolean') room.meta.allow_download = body.allowDownload;
    if (typeof body.autoDeleteFiles === 'boolean') room.meta.auto_delete_files = body.autoDeleteFiles;
    if (typeof body.maxDevices === 'number') {
      room.meta.max_devices = Math.min(100, Math.max(2, Math.floor(body.maxDevices)));
    }
    if (typeof body.extendMinutes === 'number' && body.extendMinutes > 0) {
      const base = Math.max(Date.now(), new Date(room.meta.expires_at).getTime());
      room.meta.expires_at = new Date(base + Math.min(1440, body.extendMinutes) * 60 * 1000).toISOString();
    }
    if (body.clearPassword) {
      room.meta.password_salt = null;
      room.meta.password_hash = null;
    } else if (typeof body.newPassword === 'string' && body.newPassword.trim()) {
      const pw = hashPassword(body.newPassword.trim());
      room.meta.password_salt = pw.salt;
      room.meta.password_hash = pw.hash;
    }

    room.meta.updated_at = new Date().toISOString();
    broadcastToRoom(room, 'room:updated', toPublicRoom(room));
    res.json({ ok: true, room: toPublicRoom(room) });
  });

  // 6. Host reviews join request
  app.post('/api/rooms/:roomId/join-requests/:requestId', requireSession, (req: AuthedRequest, res) => {
    const room = rooms.get(String(req.params.roomId));
    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }
    const actor = getActiveMember(room, req.userId!);
    if (!actor || actor.role !== 'host') {
      res.status(403).json({ error: 'Only the host can review join requests' });
      return;
    }
    const joinReq = room.joinRequests.get(String(req.params.requestId));
    const decision = req.body?.decision;
    if (!joinReq || (decision !== 'approved' && decision !== 'rejected')) {
      res.status(400).json({ error: 'Invalid join request or decision' });
      return;
    }

    joinReq.request_status = decision;
    joinReq.reviewed_by = actor.id;
    joinReq.reviewed_at = new Date().toISOString();

    for (const m of room.members.values()) {
      if (m.user_id === joinReq.requested_by && m.device_id === joinReq.device_id) {
        m.membership_status = decision === 'approved' ? 'active' : 'rejected';
        m.last_seen_at = new Date().toISOString();
        broadcastToRoom(room, 'member:updated', m);
        sendToMember(room, m.id, 'join-request:resolved', {
          requestId: joinReq.id,
          decision,
        });
        if (decision === 'approved') {
          addSystemMessage(room, `${m.display_name} joined the room.`, m.id);
          pushPresence(room);
        }
      }
    }

    broadcastToRoom(room, 'join-request:updated', joinReq);
    res.json({ ok: true });
  });

  // 7. Remove member / Transfer host / End room / Leave room
  app.post('/api/rooms/:roomId/members/:memberId/remove', requireSession, (req: AuthedRequest, res) => {
    const room = rooms.get(String(req.params.roomId));
    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }
    const actor = getActiveMember(room, req.userId!);
    if (!actor || actor.role !== 'host') {
      res.status(403).json({ error: 'Only the host can remove devices' });
      return;
    }
    const target = room.members.get(String(req.params.memberId));
    if (!target || target.role === 'host') {
      res.status(400).json({ error: 'Cannot remove target device' });
      return;
    }
    target.membership_status = 'removed';
    target.left_at = new Date().toISOString();
    broadcastToRoom(room, 'member:updated', target);
    const ws = room.sockets.get(target.id);
    if (ws) {
      try {
        ws.close(4003, 'removed');
      } catch {
        // ignore
      }
      room.sockets.delete(target.id);
    }
    // Also remove unstored file references belonging to removed sender
    room.files.forEach((f, fid) => {
      if (f.uploaded_by === target.id) {
        room.files.delete(fid);
        broadcastToRoom(room, 'file:deleted', { fileId: fid });
      }
    });
    addSystemMessage(room, `${target.display_name} was removed from the room.`);
    pushPresence(room);
    res.json({ ok: true });
  });

  app.post('/api/rooms/:roomId/transfer-host', requireSession, (req: AuthedRequest, res) => {
    const room = rooms.get(String(req.params.roomId));
    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }
    const actor = getActiveMember(room, req.userId!);
    if (!actor || actor.role !== 'host') {
      res.status(403).json({ error: 'Only the host can transfer ownership' });
      return;
    }
    const target = room.members.get(String(req.body?.newHostMemberId));
    if (!target || target.membership_status !== 'active') {
      res.status(400).json({ error: 'Target device must be active' });
      return;
    }
    actor.role = 'member';
    target.role = 'host';
    room.meta.host_user_id = target.user_id;
    broadcastToRoom(room, 'member:updated', actor);
    broadcastToRoom(room, 'member:updated', target);
    broadcastToRoom(room, 'room:updated', toPublicRoom(room));
    addSystemMessage(room, `${target.display_name} is now the room host.`, target.id);
    res.json({ ok: true });
  });

  app.post('/api/rooms/:roomId/end', requireSession, (req: AuthedRequest, res) => {
    const room = rooms.get(String(req.params.roomId));
    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }
    const actor = getActiveMember(room, req.userId!);
    if (!actor || actor.role !== 'host') {
      res.status(403).json({ error: 'Only the host can end the room' });
      return;
    }
    expireAndPurgeRoom(room, 'ended');
    res.json({ ok: true });
  });

  app.post('/api/rooms/:roomId/leave', requireSession, (req: AuthedRequest, res) => {
    const room = rooms.get(String(req.params.roomId));
    if (!room) {
      res.json({ ok: true });
      return;
    }
    const actor = getActiveMember(room, req.userId!);
    if (actor) {
      actor.membership_status = 'left';
      actor.left_at = new Date().toISOString();
      broadcastToRoom(room, 'member:updated', actor);
      room.sockets.delete(actor.id);
      room.files.forEach((f, fid) => {
        if (f.uploaded_by === actor.id) {
          room.files.delete(fid);
          broadcastToRoom(room, 'file:deleted', { fileId: fid });
        }
      });
      addSystemMessage(room, `${actor.display_name} left the room.`);
      pushPresence(room);
    }
    res.json({ ok: true });
  });

  // 8. Announce Shared File Metadata ONLY (zero file storage on server!)
  app.post('/api/rooms/:roomId/files', requireSession, (req: AuthedRequest, res) => {
    const room = rooms.get(String(req.params.roomId));
    if (!room || room.meta.status !== 'active') {
      res.status(404).json({ error: 'Room not found or expired' });
      return;
    }
    const actor = getActiveMember(room, req.userId!);
    if (!actor) {
      res.status(403).json({ error: 'Not an active room member' });
      return;
    }
    if (!room.meta.allow_upload && actor.role !== 'host') {
      res.status(403).json({ error: 'Guest uploads are disabled by the host' });
      return;
    }

    const {
      fileId = crypto.randomUUID(),
      originalFileName,
      mimeType = 'application/octet-stream',
      fileSize = 0,
      transferMode = 'cloud',
      checksum = null,
    } = req.body || {};

    const numericSize = Number(fileSize);
    if (!Number.isFinite(numericSize) || numericSize < 0 || numericSize > room.meta.max_file_size_bytes) {
      res.status(400).json({ error: 'File exceeds maximum allowed size' });
      return;
    }

    const cleanName = sanitizeFileName(originalFileName);
    const dotIdx = cleanName.lastIndexOf('.');
    const ext = dotIdx > 0 ? cleanName.slice(dotIdx + 1).toLowerCase() : '';

    const sharedFile: SharedFile = {
      id: String(fileId),
      room_id: room.meta.id,
      uploaded_by: actor.id,
      original_file_name: cleanName,
      storage_path: '',
      mime_type: String(mimeType || 'application/octet-stream').slice(0, 128),
      file_extension: ext,
      file_size: numericSize,
      transfer_mode: transferMode === 'webrtc' ? 'webrtc' : 'cloud',
      upload_status: 'available',
      checksum: typeof checksum === 'string' ? checksum : null,
      created_at: new Date().toISOString(),
      expires_at: room.meta.expires_at,
      deleted_at: null,
    };

    room.files.set(sharedFile.id, sharedFile);
    room.lastActivityAt = Date.now();
    broadcastToRoom(room, 'file:added', sharedFile);
    addSystemMessage(room, `${actor.display_name} shared ${cleanName}.`, actor.id);

    res.json(sharedFile);
  });

  // Delete shared file reference
  app.delete('/api/rooms/:roomId/files/:fileId', requireSession, (req: AuthedRequest, res) => {
    const room = rooms.get(String(req.params.roomId));
    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }
    const actor = getActiveMember(room, req.userId!);
    if (!actor) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    const file = room.files.get(String(req.params.fileId));
    if (!file) {
      res.status(404).json({ error: 'File not found' });
      return;
    }
    if (actor.role !== 'host' && file.uploaded_by !== actor.id) {
      res.status(403).json({ error: 'Not authorized to delete this file' });
      return;
    }
    room.files.delete(file.id);
    broadcastToRoom(room, 'file:deleted', { fileId: file.id });
    res.json({ ok: true });
  });

  // 9. Short-lived Stream Token & Live Zero-Storage Pipe Relay
  app.post('/api/rooms/:roomId/files/:fileId/stream-token', requireSession, (req: AuthedRequest, res) => {
    const room = rooms.get(String(req.params.roomId));
    if (!room || room.meta.status !== 'active') {
      res.status(404).json({ error: 'Room unavailable' });
      return;
    }
    const actor = getActiveMember(room, req.userId!);
    if (!actor) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    if (!room.meta.allow_download && actor.role !== 'host') {
      res.status(403).json({ error: 'File downloads are disabled by the host' });
      return;
    }
    const file = room.files.get(String(req.params.fileId));
    if (!file) {
      res.status(404).json({ error: 'File no longer available in this session' });
      return;
    }

    const token = crypto.randomBytes(24).toString('base64url');
    streamTokens.set(token, {
      roomId: room.meta.id,
      fileId: file.id,
      memberId: actor.id,
      expiresAt: Date.now() + 90_000,
    });
    res.json({ streamUrl: `/api/rooms/${room.meta.id}/files/${file.id}/stream?st=${token}` });
  });

  // Receiver connects here -> server triggers live pipe from Sender browser -> zero storage!
  app.get('/api/rooms/:roomId/files/:fileId/stream', (req: AuthedRequest, res) => {
    const roomId = String(req.params.roomId);
    const fileId = String(req.params.fileId);
    const st = typeof req.query.st === 'string' ? req.query.st : '';

    let authorizedMemberId: string | null = null;
    if (st) {
      const entry = streamTokens.get(st);
      if (entry && entry.roomId === roomId && entry.fileId === fileId && entry.expiresAt > Date.now()) {
        authorizedMemberId = entry.memberId;
      }
    } else if (req.headers.authorization?.startsWith('Bearer ')) {
      const uid = verifySessionToken(req.headers.authorization.slice(7));
      const r = rooms.get(roomId);
      const m = uid && r ? getActiveMember(r, uid) : null;
      if (m) authorizedMemberId = m.id;
    }

    const room = rooms.get(roomId);
    if (!room || !authorizedMemberId || room.meta.status !== 'active') {
      res.status(403).json({ error: 'Unauthorized or expired stream token' });
      return;
    }
    const actor = room.members.get(authorizedMemberId);
    if (!actor || (!room.meta.allow_download && actor.role !== 'host')) {
      res.status(403).json({ error: 'Downloads disabled' });
      return;
    }

    const file = room.files.get(fileId);
    if (!file) {
      res.status(404).json({ error: 'File not found in active session' });
      return;
    }

    const streamId = crypto.randomUUID();
    const timeoutId = setTimeout(() => {
      const pending = pendingStreams.get(streamId);
      if (pending && !pending.started) {
        pendingStreams.delete(streamId);
        if (!res.headersSent) {
          res.status(504).json({ error: 'Sender device did not respond in time' });
        }
      }
    }, 15_000);

    pendingStreams.set(streamId, {
      streamId,
      roomId,
      fileId,
      senderMemberId: file.uploaded_by,
      receiverRes: res,
      timeoutId,
      started: false,
    });

    const delivered = sendToMember(room, file.uploaded_by, 'file:pull', {
      streamId,
      fileId: file.id,
      fileName: file.original_file_name,
    });

    if (!delivered) {
      clearTimeout(timeoutId);
      pendingStreams.delete(streamId);
      res.status(410).json({
        error: 'Sender device disconnected. Files are streamed live during a session and are never stored on any server.',
      });
      return;
    }

    req.on('close', () => {
      const pending = pendingStreams.get(streamId);
      if (pending) {
        clearTimeout(pending.timeoutId);
        pendingStreams.delete(streamId);
      }
    });
  });

  // Sender streams file bytes here -> piped directly to waiting Receiver HTTP response
  app.post('/api/streams/:streamId', requireSession, (req: AuthedRequest, res) => {
    const streamId = String(req.params.streamId);
    const pending = pendingStreams.get(streamId);
    if (!pending) {
      res.status(404).json({ error: 'Stream session closed or expired' });
      return;
    }

    const room = rooms.get(pending.roomId);
    const sender = room ? getActiveMember(room, req.userId!) : null;
    if (!room || !sender || sender.id !== pending.senderMemberId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const file = room.files.get(pending.fileId);
    if (!file) {
      clearTimeout(pending.timeoutId);
      pendingStreams.delete(streamId);
      res.status(404).json({ error: 'File metadata missing' });
      return;
    }

    pending.started = true;
    clearTimeout(pending.timeoutId);

    const safeDownloadName = file.original_file_name.replace(/["\r\n]/g, '_');
    pending.receiverRes.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
    pending.receiverRes.setHeader('Content-Length', String(file.file_size));
    pending.receiverRes.setHeader(
      'Content-Disposition',
      `inline; filename*=UTF-8''${encodeURIComponent(safeDownloadName)}`
    );
    pending.receiverRes.setHeader('Cache-Control', 'no-store');

    req.on('data', (chunk: Buffer) => {
      if (!pending.receiverRes.writableEnded) {
        const ok = pending.receiverRes.write(chunk);
        if (!ok) {
          req.pause();
          pending.receiverRes.once('drain', () => req.resume());
        }
      }
    });

    req.on('end', () => {
      pendingStreams.delete(streamId);
      if (!pending.receiverRes.writableEnded) {
        pending.receiverRes.end();
      }
      if (!res.headersSent) {
        res.json({ ok: true });
      }
    });

    req.on('error', () => {
      pendingStreams.delete(streamId);
      if (!pending.receiverRes.writableEnded) {
        pending.receiverRes.destroy();
      }
    });
  });

  // 10. Room Chat Messages
  app.post('/api/rooms/:roomId/messages', requireSession, (req: AuthedRequest, res) => {
    const room = rooms.get(String(req.params.roomId));
    if (!room || room.meta.status !== 'active') {
      res.status(404).json({ error: 'Room not found' });
      return;
    }
    const actor = getActiveMember(room, req.userId!);
    if (!actor) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    if (!room.meta.allow_chat && actor.role !== 'host') {
      res.status(403).json({ error: 'Chat is disabled by the host' });
      return;
    }

    const content = typeof req.body?.content === 'string' ? req.body.content.trim() : '';
    if (!content || content.length > 4000) {
      res.status(400).json({ error: 'Message must be 1–4000 characters' });
      return;
    }

    const rawType = req.body?.messageType;
    const messageType: RoomMessage['message_type'] =
      rawType === 'code' ? 'code' : /^https?:\/\/\S+$/i.test(content) ? 'link' : 'text';

    const message: RoomMessage = {
      id: crypto.randomUUID(),
      room_id: room.meta.id,
      sender_member_id: actor.id,
      message_type: messageType,
      message_content: content,
      created_at: new Date().toISOString(),
      deleted_at: null,
    };

    room.messages.push(message);
    if (room.messages.length > 500) room.messages.shift();
    room.lastActivityAt = Date.now();
    broadcastToRoom(room, 'message:added', message);
    res.json(message);
  });

  app.delete('/api/rooms/:roomId/messages/:messageId', requireSession, (req: AuthedRequest, res) => {
    const room = rooms.get(String(req.params.roomId));
    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }
    const actor = getActiveMember(room, req.userId!);
    if (!actor) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    const msg = room.messages.find((m) => m.id === String(req.params.messageId));
    if (!msg) {
      res.status(404).json({ error: 'Message not found' });
      return;
    }
    if (actor.role !== 'host' && msg.sender_member_id !== actor.id) {
      res.status(403).json({ error: 'Cannot delete another user message' });
      return;
    }
    msg.deleted_at = new Date().toISOString();
    broadcastToRoom(room, 'message:deleted', { messageId: msg.id });
    res.json({ ok: true });
  });

  // Mount Vite middlewares in development or serve static dist in production
  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(import.meta.dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexHtml = path.join(distDir, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send('Build output not found');
      }
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`DropBridge ephemeral session server listening on http://0.0.0.0:${PORT}`);
  });
}

void startServer();

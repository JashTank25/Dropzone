import { z } from 'zod';

export const roomCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, 'Room code must be exactly 6 digits');

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, 'Display name is required')
  .max(64, 'Display name must be 64 characters or fewer');

export const createRoomSchema = z.object({
  roomName: z
    .string()
    .trim()
    .min(1, 'Room name is required')
    .max(80, 'Room name must be 80 characters or fewer'),
  displayName: displayNameSchema,
  durationMinutes: z.enum(['15', '30', '60', '360', '1440']),
  password: z
    .string()
    .max(64, 'Password must be 64 characters or fewer')
    .optional()
    .or(z.literal('')),
});

export const joinRoomSchema = z.object({
  roomCode: roomCodeSchema,
  displayName: displayNameSchema,
  password: z.string().max(64).optional().or(z.literal('')),
});

export const roomSettingsSchema = z.object({
  roomName: z.string().trim().min(1, 'Room name is required').max(80),
  isLocked: z.boolean(),
  requireApproval: z.boolean(),
  allowChat: z.boolean(),
  allowUpload: z.boolean(),
  allowDownload: z.boolean(),
  autoDeleteFiles: z.boolean(),
  maxDevices: z.number().int().min(2).max(100),
  newPassword: z.string().max(64).optional().or(z.literal('')),
  clearPassword: z.boolean(),
});

export const chatMessageSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, 'Message cannot be empty')
    .max(4000, 'Message cannot exceed 4,000 characters'),
});

export function isSafeHttpUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function extractRoomCodeFromInput(input: string): string | null {
  const trimmed = input.trim();
  if (/^\d{6}$/.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed);
    const codeParam = url.searchParams.get('code');
    if (codeParam && /^\d{6}$/.test(codeParam)) return codeParam;
    const match = url.pathname.match(/\/room\/(\d{6})/);
    if (match) return match[1];
  } catch {
    const match = trimmed.match(/\b(\d{6})\b/);
    if (match) return match[1];
  }
  return null;
}

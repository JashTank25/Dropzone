import { describe, expect, it } from 'vitest';
import {
  chatMessageSchema,
  extractRoomCodeFromInput,
  isSafeHttpUrl,
  roomCodeSchema,
} from '../lib/validation/schemas';

describe('validation schemas & URL safety', () => {
  it('validates 6-digit numeric room codes', () => {
    expect(roomCodeSchema.safeParse('482910').success).toBe(true);
    expect(roomCodeSchema.safeParse('000123').success).toBe(true);
    expect(roomCodeSchema.safeParse('12345').success).toBe(false);
    expect(roomCodeSchema.safeParse('12345a').success).toBe(false);
  });

  it('extracts room codes from invite URLs and raw strings', () => {
    expect(extractRoomCodeFromInput('918273')).toBe('918273');
    expect(extractRoomCodeFromInput('https://dropbridge.app/?code=445566')).toBe('445566');
    expect(extractRoomCodeFromInput('https://dropbridge.app/room/778899')).toBe('778899');
    expect(extractRoomCodeFromInput('invalid')).toBeNull();
  });

  it('blocks dangerous URL schemes', () => {
    expect(isSafeHttpUrl('https://example.com/file.pdf')).toBe(true);
    expect(isSafeHttpUrl('http://localhost:3000')).toBe(true);
    expect(isSafeHttpUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeHttpUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
  });

  it('enforces chat message bounds', () => {
    expect(chatMessageSchema.safeParse({ content: 'Hello room' }).success).toBe(true);
    expect(chatMessageSchema.safeParse({ content: '   ' }).success).toBe(false);
  });
});

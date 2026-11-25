import { describe, expect, it } from 'vitest';
import { formatBytes, formatCountdown, formatEta, formatSpeed } from '../utils/format';

describe('formatting utilities', () => {
  it('formats byte values accurately', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(1048576)).toBe('1.0 MB');
  });

  it('formats transfer speed and ETA', () => {
    expect(formatSpeed(2048)).toBe('2.0 KB/s');
    expect(formatEta(45)).toBe('45s left');
    expect(formatEta(125)).toBe('2m 5s left');
  });

  it('computes countdown expiration state', () => {
    const now = Date.UTC(2026, 0, 1, 12, 0, 0);
    const soon = new Date(now + 120 * 1000).toISOString();
    const expired = new Date(now - 5000).toISOString();

    expect(formatCountdown(soon, now)).toEqual({
      label: '02:00',
      remainingMs: 120000,
      isExpiringSoon: true,
      isExpired: false,
    });
    expect(formatCountdown(expired, now).isExpired).toBe(true);
  });
});

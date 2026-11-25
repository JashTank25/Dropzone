import type { DeviceType } from '@/src/types';

export interface DeviceInfo {
  deviceId: string;
  deviceType: DeviceType;
  browser: string;
  operatingSystem: string;
  defaultDisplayName: string;
}

const DEVICE_ID_STORAGE_KEY = 'dropbridge_device_id';
const DISPLAY_NAME_STORAGE_KEY = 'dropbridge_display_name';

export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return 'server-device';
  let existing = window.localStorage.getItem(DEVICE_ID_STORAGE_KEY);
  if (!existing) {
    existing = crypto.randomUUID();
    window.localStorage.setItem(DEVICE_ID_STORAGE_KEY, existing);
  }
  return existing;
}

export function getSavedDisplayName(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(DISPLAY_NAME_STORAGE_KEY);
}

export function saveDisplayName(name: string): void {
  if (typeof window === 'undefined') return;
  const trimmed = name.trim();
  if (trimmed) {
    window.localStorage.setItem(DISPLAY_NAME_STORAGE_KEY, trimmed.slice(0, 64));
  }
}

export function detectDeviceInfo(userAgentInput?: string): DeviceInfo {
  const ua = userAgentInput ?? (typeof navigator !== 'undefined' ? navigator.userAgent : '');
  const lower = ua.toLowerCase();

  let operatingSystem = 'Unknown OS';
  let deviceType: DeviceType = 'desktop';
  let defaultDisplayName = 'Guest Device';

  if (/iphone/.test(lower)) {
    operatingSystem = 'iOS';
    deviceType = 'mobile';
    defaultDisplayName = 'iPhone';
  } else if (/ipad/.test(lower) || (/macintosh/.test(lower) && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1)) {
    operatingSystem = 'iPadOS';
    deviceType = 'tablet';
    defaultDisplayName = 'iPad';
  } else if (/android/.test(lower)) {
    operatingSystem = 'Android';
    if (/mobile/.test(lower)) {
      deviceType = 'mobile';
      defaultDisplayName = 'Android Phone';
    } else {
      deviceType = 'tablet';
      defaultDisplayName = 'Android Tablet';
    }
  } else if (/mac os x|macintosh/.test(lower)) {
    operatingSystem = 'macOS';
    deviceType = 'desktop';
    defaultDisplayName = 'MacBook';
  } else if (/windows/.test(lower)) {
    operatingSystem = 'Windows';
    deviceType = 'desktop';
    defaultDisplayName = 'Windows Desktop';
  } else if (/cros/.test(lower)) {
    operatingSystem = 'ChromeOS';
    deviceType = 'desktop';
    defaultDisplayName = 'Chromebook';
  } else if (/linux/.test(lower)) {
    operatingSystem = 'Linux';
    deviceType = 'desktop';
    defaultDisplayName = 'Linux Desktop';
  }

  let browser = 'Unknown Browser';
  if (/edg\//.test(lower)) {
    browser = 'Edge';
  } else if (/opr\/|opera/.test(lower)) {
    browser = 'Opera';
  } else if (/chrome|crios/.test(lower)) {
    browser = 'Chrome';
  } else if (/firefox|fxios/.test(lower)) {
    browser = 'Firefox';
  } else if (/safari/.test(lower)) {
    browser = 'Safari';
  }

  return {
    deviceId: getOrCreateDeviceId(),
    deviceType,
    browser,
    operatingSystem,
    defaultDisplayName: getSavedDisplayName() || defaultDisplayName,
  };
}

import { create } from 'zustand';
import { detectDeviceInfo, saveDisplayName, type DeviceInfo } from '@/src/utils/device';

interface SessionState {
  userId: string | null;
  sessionToken: string | null;
  deviceInfo: DeviceInfo;
  displayName: string;
  isAuthReady: boolean;
  setSession: (userId: string, token: string) => void;
  setDisplayName: (name: string) => void;
  clearSession: () => void;
}

const initialDevice = detectDeviceInfo();

export const useSessionStore = create<SessionState>((set) => ({
  userId: null,
  sessionToken: null,
  deviceInfo: initialDevice,
  displayName: initialDevice.defaultDisplayName,
  isAuthReady: false,
  // Kept strictly in JS memory for single-session security
  setSession: (userId, sessionToken) => set({ userId, sessionToken, isAuthReady: true }),
  setDisplayName: (name) => {
    const clean = name.trim().slice(0, 64) || initialDevice.defaultDisplayName;
    saveDisplayName(clean);
    set({ displayName: clean });
  },
  clearSession: () => set({ userId: null, sessionToken: null, isAuthReady: false }),
}));

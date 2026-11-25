export const envConfig = {
  maxFileSizeBytes: (Number(import.meta.env.VITE_MAX_FILE_SIZE_MB) || 250) * 1024 * 1024,
  turnUrl: import.meta.env.VITE_TURN_URL?.trim() || '',
  turnUsername: import.meta.env.VITE_TURN_USERNAME?.trim() || '',
  turnCredential: import.meta.env.VITE_TURN_CREDENTIAL?.trim() || '',
};

export function getRtcIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];

  if (envConfig.turnUrl) {
    servers.push({
      urls: envConfig.turnUrl,
      username: envConfig.turnUsername || undefined,
      credential: envConfig.turnCredential || undefined,
    });
  }

  return servers;
}

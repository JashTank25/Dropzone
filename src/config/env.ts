const rawApiBase = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, '') || '';

export const envConfig = {
  apiBaseUrl: rawApiBase,
  maxFileSizeBytes: (Number(import.meta.env.VITE_MAX_FILE_SIZE_MB) || 250) * 1024 * 1024,
  turnUrl: import.meta.env.VITE_TURN_URL?.trim() || '',
  turnUsername: import.meta.env.VITE_TURN_USERNAME?.trim() || '',
  turnCredential: import.meta.env.VITE_TURN_CREDENTIAL?.trim() || '',
};

export function buildApiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return rawApiBase ? `${rawApiBase}${normalized}` : normalized;
}

export function buildWsUrl(pathWithQuery: string): string {
  const normalized = pathWithQuery.startsWith('/') ? pathWithQuery : `/${pathWithQuery}`;
  if (rawApiBase) {
    const parsed = new URL(rawApiBase);
    const wsProtocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProtocol}//${parsed.host}${normalized}`;
  }
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${wsProtocol}//${window.location.host}${normalized}`;
}

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

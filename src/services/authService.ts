import { buildApiUrl } from '@/src/config/env';
import { useSessionStore } from '@/src/stores/useSessionStore';

export async function ensureEphemeralSession(): Promise<{ userId: string; token: string }> {
  const current = useSessionStore.getState();
  if (current.userId && current.sessionToken) {
    return { userId: current.userId, token: current.sessionToken };
  }

  const res = await fetch(buildApiUrl('/api/session'), { method: 'POST' });
  if (!res.ok) {
    if (res.status === 404 || res.status === 405) {
      throw new Error(
        `Backend API unavailable (HTTP ${res.status}). Deploy the Node.js server (npm start) on a WebSocket-capable host or configure VITE_API_BASE_URL.`
      );
    }
    throw new Error('Unable to initialize ephemeral session.');
  }
  const data = (await res.json()) as { userId: string; token: string };
  useSessionStore.getState().setSession(data.userId, data.token);
  return data;
}

export async function authedFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const { token } = await ensureEphemeralSession();
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  if (init.body && typeof init.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return fetch(buildApiUrl(input), { ...init, headers });
}

import { authedFetch } from '@/src/services/authService';
import type { MessageType } from '@/src/types';

export async function sendChatMessage(params: {
  roomId: string;
  content: string;
  messageType?: Exclude<MessageType, 'system'>;
}): Promise<void> {
  const trimmed = params.content.trim();
  if (!trimmed) return;

  const res = await authedFetch(`/api/rooms/${params.roomId}/messages`, {
    method: 'POST',
    body: JSON.stringify({
      content: trimmed.slice(0, 4000),
      messageType: params.messageType,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Unable to send message.');
}

export async function deleteChatMessage(roomId: string, messageId: string): Promise<void> {
  const res = await authedFetch(`/api/rooms/${roomId}/messages/${messageId}`, {
    method: 'DELETE',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Unable to delete message.');
}

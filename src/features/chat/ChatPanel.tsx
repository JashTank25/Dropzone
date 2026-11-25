import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/src/components/ui/button';
import { ChatIcon, SendIcon } from '@/src/components/common/StreamlineIcons';
import { ChatMessage } from '@/src/features/chat/ChatMessage';
import { deleteChatMessage, sendChatMessage } from '@/src/services/chatService';
import { useRoomStore } from '@/src/stores/useRoomStore';
import { chatMessageSchema } from '@/src/lib/validation/schemas';

interface ChatPanelProps {
  onTypingChange: (isTyping: boolean) => void;
}

export function ChatPanel({ onTypingChange }: ChatPanelProps) {
  const room = useRoomStore((s) => s.room);
  const currentMember = useRoomStore((s) => s.currentMember);
  const members = useRoomStore((s) => s.members);
  const messages = useRoomStore((s) => s.messages);
  const typingMemberIds = useRoomStore((s) => s.typingMemberIds);

  const [draft, setDraft] = useState('');
  const [isCodeSnippet, setIsCodeSnippet] = useState(false);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const membersById = useMemo(
    () => Object.fromEntries(members.map((m) => [m.id, m])),
    [members]
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  if (!room || !currentMember) return null;

  const isHost = currentMember.role === 'host';
  const canSend = room.allow_chat || isHost;

  const activeTypers = Object.keys(typingMemberIds)
    .filter((id) => id !== currentMember.id && membersById[id])
    .map((id) => membersById[id].display_name);

  const handleDraftChange = (val: string) => {
    setDraft(val);
    onTypingChange(val.trim().length > 0);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => onTypingChange(false), 2500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = chatMessageSchema.safeParse({ content: draft });
    if (!parsed.success) return;

    setSending(true);
    try {
      await sendChatMessage({
        roomId: room.id,
        content: parsed.data.content,
        messageType: isCodeSnippet ? 'code' : undefined,
      });
      setDraft('');
      setIsCodeSnippet(false);
      onTypingChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to send message');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (messageId: string) => {
    try {
      await deleteChatMessage(room.id, messageId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to delete message');
    }
  };

  return (
    <div className="flex h-full flex-col bg-background/50">
      <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-3">
        <div className="flex items-center gap-2">
          <ChatIcon size={16} className="text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Room Chat</h2>
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">{messages.length}</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 ? (
          <div className="py-12 text-center text-xs text-muted-foreground">
            Share links, notes, or code snippets with connected devices.
          </div>
        ) : (
          messages.map((msg) => (
            <ChatMessage
              key={msg.id}
              message={msg}
              sender={msg.sender_member_id ? membersById[msg.sender_member_id] : undefined}
              isOwn={msg.sender_member_id === currentMember.id}
              canDelete={isHost || msg.sender_member_id === currentMember.id}
              onDelete={(id) => void handleDelete(id)}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {activeTypers.length > 0 && (
        <div className="px-4 pb-1 text-[11px] text-muted-foreground">
          {activeTypers.join(', ')} {activeTypers.length === 1 ? 'is' : 'are'} typing...
        </div>
      )}

      <form onSubmit={(e) => void handleSubmit(e)} className="border-t border-border bg-surface p-3">
        {!canSend ? (
          <p className="py-2 text-center text-xs text-muted-foreground">
            Chat has been disabled by the room host.
          </p>
        ) : (
          <div className="space-y-2">
            <textarea
              rows={2}
              value={draft}
              onChange={(e) => handleDraftChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void handleSubmit(e);
                }
              }}
              placeholder={isCodeSnippet ? 'Paste code snippet...' : 'Send message, URL, or note...'}
              disabled={sending}
              className="w-full resize-none rounded-lg border border-input-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring"
            />
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setIsCodeSnippet((v) => !v)}
                className={`rounded-md px-2 py-1 font-mono text-[11px] font-medium transition-colors ${
                  isCodeSnippet
                    ? 'bg-foreground text-primary-foreground'
                    : 'bg-surface-subtle text-muted-foreground hover:text-foreground'
                }`}
              >
                Code Snippet
              </button>
              <Button type="submit" size="sm" disabled={sending || !draft.trim()}>
                <SendIcon size={14} />
                <span>Send</span>
              </Button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}

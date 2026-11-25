import * as React from 'react';
import { toast } from 'sonner';
import { CopyIcon, TrashIcon } from '@/src/components/common/StreamlineIcons';
import { isSafeHttpUrl } from '@/src/lib/validation/schemas';
import { formatTimeShort } from '@/src/utils/format';
import type { RoomMember, RoomMessage } from '@/src/types';

interface ChatMessageProps {
  message: RoomMessage;
  sender?: RoomMember;
  isOwn: boolean;
  canDelete: boolean;
  onDelete: (id: string) => void;
}

function renderMessageWithSafeLinks(text: string): React.ReactNode {
  const urlPattern = /(https?:\/\/[^\s<]+)/g;
  const parts = text.split(urlPattern);
  return parts.map((part, idx) => {
    if (/^https?:\/\//i.test(part) && isSafeHttpUrl(part)) {
      return (
        <a
          key={idx}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline break-all hover:opacity-80"
        >
          {part}
        </a>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

export function ChatMessage({ message, sender, isOwn, canDelete, onDelete }: ChatMessageProps) {
  if (message.message_type === 'system') {
    return (
      <div className="py-1 text-center text-[11px] text-muted-foreground">
        <span>{message.message_content}</span>
        <span className="ml-1.5 font-mono tabular-nums opacity-75">
          {formatTimeShort(message.created_at)}
        </span>
      </div>
    );
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.message_content);
      toast.success('Message copied');
    } catch {
      toast.error('Clipboard access denied');
    }
  };

  return (
    <div className={`group flex flex-col gap-1 ${isOwn ? 'items-end' : 'items-start'}`}>
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <span className="font-medium text-foreground">
          {isOwn ? 'You' : sender?.display_name || 'Guest'}
        </span>
        {sender && !isOwn && <span>· {sender.operating_system}</span>}
        <span className="font-mono tabular-nums">· {formatTimeShort(message.created_at)}</span>
      </div>

      <div
        className={`relative max-w-[90%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
          isOwn
            ? 'bg-primary text-primary-foreground'
            : 'border border-border bg-surface text-foreground'
        }`}
      >
        {message.message_type === 'code' ? (
          <pre className="overflow-x-auto font-mono text-[11px] whitespace-pre-wrap break-words">
            <code>{message.message_content}</code>
          </pre>
        ) : (
          <p className="whitespace-pre-wrap break-words">
            {isOwn ? message.message_content : renderMessageWithSafeLinks(message.message_content)}
          </p>
        )}

        <div
          className={`mt-1 flex items-center justify-end gap-1.5 opacity-0 transition-opacity group-hover:opacity-100 ${
            isOwn ? 'text-primary-foreground/80' : 'text-muted-foreground'
          }`}
        >
          <button
            type="button"
            onClick={() => void handleCopy()}
            className="p-0.5 hover:opacity-100"
            aria-label="Copy message"
            title="Copy message"
          >
            <CopyIcon size={12} />
          </button>
          {canDelete && (
            <button
              type="button"
              onClick={() => onDelete(message.id)}
              className="p-0.5 hover:opacity-100"
              aria-label="Delete message"
              title="Delete message"
            >
              <TrashIcon size={12} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

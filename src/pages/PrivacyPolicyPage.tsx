import { AppContainer } from '@/src/components/common/AppContainer';
import { AppHeader } from '@/src/components/common/AppHeader';
import { DropBridgeMark } from '@/src/components/common/StreamlineIcons';
import { Button } from '@/src/components/ui/button';

export function PrivacyPolicyPage({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader
        left={
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2.5 text-base font-bold text-foreground"
          >
            <DropBridgeMark size={24} />
            <span>DropBridge</span>
          </button>
        }
        right={
          <Button size="sm" variant="outline" onClick={onBack}>
            Back
          </Button>
        }
      />

      <AppContainer className="py-10 max-w-3xl">
        <h1 className="text-2xl font-bold text-foreground">Privacy &amp; Security Architecture</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          How DropBridge handles temporary single-session rooms, live file streams, and automatic cleanup.
        </p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-foreground">
          <section className="rounded-xl border border-border bg-surface p-5">
            <h2 className="text-base font-semibold">1. Ephemeral In-Memory Sessions</h2>
            <p className="mt-2 text-muted-foreground">
              DropBridge issues a short-lived HMAC-SHA256 session token held strictly in browser memory (never persisted to <code className="font-mono text-xs text-foreground">localStorage</code> or cookies) without requiring an email address, phone number, or account.
            </p>
          </section>

          <section className="rounded-xl border border-border bg-surface p-5">
            <h2 className="text-base font-semibold">2. Zero Disk or Database File Storage</h2>
            <p className="mt-2 text-muted-foreground">
              DropBridge never writes shared files to any database, cloud bucket, or server filesystem. File handles remain solely in the sender&apos;s browser memory for the active session and are streamed directly on demand to authorized room members.
            </p>
          </section>

          <section className="rounded-xl border border-border bg-surface p-5">
            <h2 className="text-base font-semibold">3. Live Session Relay vs. Direct Peer-to-Peer</h2>
            <p className="mt-2 text-muted-foreground">
              In Live Session Relay mode, bytes are piped directly in transit from the sender&apos;s browser to the receiver&apos;s browser through an unbuffered stream without caching on disk or in server memory. In Direct Transfer Mode (WebRTC), file chunks flow directly between browsers over encrypted DTLS data channels.
            </p>
          </section>

          <section className="rounded-xl border border-border bg-surface p-5">
            <h2 className="text-base font-semibold">4. Instant Single-Session Cleanup</h2>
            <p className="mt-2 text-muted-foreground">
              Room metadata and recent chat history live strictly in volatile server RAM and are purged automatically when the room expires, the host ends the room, or all devices disconnect. When a sender leaves, their shared file references are removed immediately.
            </p>
          </section>
        </div>
      </AppContainer>
    </div>
  );
}

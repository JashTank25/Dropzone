import { AppContainer } from '@/src/components/common/AppContainer';
import { AppHeader } from '@/src/components/common/AppHeader';
import { DropBridgeMark } from '@/src/components/common/StreamlineIcons';
import { Button } from '@/src/components/ui/button';

export function HelpPage({ onBack }: { onBack: () => void }) {
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

      <AppContainer className="py-10 max-w-3xl space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Help &amp; Troubleshooting</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            How single-session live sharing works and solutions for common device or transfer issues.
          </p>
        </div>

        <section className="rounded-xl border border-border bg-surface p-5 space-y-3 text-sm">
          <h2 className="text-base font-semibold text-foreground">How Single-Session Sharing Works</h2>
          <ol className="list-decimal pl-5 space-y-2 text-muted-foreground">
            <li>DropBridge stores zero files on any server or database. Files stay in the sender&apos;s browser memory for the current session.</li>
            <li>Keep the sender tab open until connected devices finish previewing or downloading the files you shared.</li>
            <li>When a sender leaves or the session expires, all room metadata, chat messages, and file references are purged automatically.</li>
          </ol>
        </section>

        <section className="rounded-xl border border-border bg-surface p-5 space-y-4 text-sm">
          <h2 className="text-base font-semibold text-foreground">Common Troubleshooting</h2>
          <div>
            <h3 className="font-medium text-foreground">Camera permission denied during QR scan</h3>
            <p className="mt-1 text-muted-foreground">
              Open your browser site permissions for this page, set Camera to Allow, and reload. You can always type the six-digit code directly into the Join Room form.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-foreground">Direct Transfer (WebRTC) falls back to Live Session Relay</h3>
            <p className="mt-1 text-muted-foreground">
              Strict corporate NATs or symmetric firewalls can block direct peer-to-peer data channels unless a TURN server is configured via <code className="font-mono text-xs text-foreground">VITE_TURN_URL</code>. Live Session Relay streams bytes reliably across any internet connection without storing files.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-foreground">Sender went offline before download completed</h3>
            <p className="mt-1 text-muted-foreground">
              Because files are streamed directly from the sender&apos;s browser rather than saved in cloud storage, the sharing device must remain connected in the room during downloads.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-foreground">File preview unavailable</h3>
            <p className="mt-1 text-muted-foreground">
              Binary archives (ZIP, RAR), executables, and files larger than 15 MB cannot be previewed inline for performance and safety. Use the Download button to open them locally.
            </p>
          </div>
        </section>
      </AppContainer>
    </div>
  );
}

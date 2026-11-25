import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import type { z } from 'zod';
import { AppContainer } from '@/src/components/common/AppContainer';
import { AppHeader } from '@/src/components/common/AppHeader';
import { PWAInstallButton } from '@/src/components/common/PWAInstallButton';
import {
  DropBridgeMark,
  LockIcon,
  PlusIcon,
  ShieldIcon,
} from '@/src/components/common/StreamlineIcons';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui/select';
import { RoomJoinForm } from '@/src/features/rooms/RoomJoinForm';
import { createRoomSchema, joinRoomSchema } from '@/src/lib/validation/schemas';
import { createRoom, joinRoom } from '@/src/services/roomService';
import { useSessionStore } from '@/src/stores/useSessionStore';
import { useRoomStore } from '@/src/stores/useRoomStore';

type CreateFormValues = z.infer<typeof createRoomSchema>;
type JoinFormValues = z.infer<typeof joinRoomSchema>;

interface LandingPageProps {
  initialJoinCode?: string;
  onNavigateRoom: (roomCode: string, roomId: string, memberId?: string) => void;
  onNavigatePage: (page: 'privacy' | 'help') => void;
}

export function LandingPage({
  initialJoinCode = '',
  onNavigateRoom,
  onNavigatePage,
}: LandingPageProps) {
  const displayName = useSessionStore((s) => s.displayName);
  const setDisplayName = useSessionStore((s) => s.setDisplayName);
  const deviceInfo = useSessionStore((s) => s.deviceInfo);
  const setTerminalError = useRoomStore((s) => s.setTerminalError);

  const [showCreateOptions, setShowCreateOptions] = useState(false);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [requiresPassword, setRequiresPassword] = useState(false);

  const createForm = useForm<CreateFormValues>({
    resolver: zodResolver(createRoomSchema),
    defaultValues: {
      roomName: 'DropBridge Room',
      displayName,
      durationMinutes: '60',
      password: '',
    },
  });

  const handleQuickCreate = async () => {
    const values = createForm.getValues();
    setDisplayName(values.displayName || displayName);
    setCreating(true);
    try {
      const res = await createRoom({
        roomName: values.roomName || 'DropBridge Room',
        durationMinutes: Number(values.durationMinutes) || 60,
        password: values.password || undefined,
        displayName: values.displayName || displayName,
      });
      onNavigateRoom(res.room_code, res.room_id, res.member_id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to create room');
    } finally {
      setCreating(false);
    }
  };

  const handleJoinSubmit = async (values: JoinFormValues) => {
    setJoining(true);
    setJoinError(null);
    try {
      const result = await joinRoom({
        roomCode: values.roomCode,
        displayName: values.displayName,
        password: values.password || undefined,
      });

      if (result.status === 'joined') {
        onNavigateRoom(result.room_code, result.room_id, result.member_id);
        return;
      }

      if (result.status === 'pending_approval') {
        setTerminalError({
          type: 'pending_approval',
          roomName: result.room_name,
          requestId: result.request_id,
          roomId: result.room_id,
          memberId: result.member_id,
        });
        onNavigateRoom(result.room_code, result.room_id, result.member_id);
        return;
      }

      if (result.status === 'password_required') {
        setRequiresPassword(true);
        setJoinError('This room is password protected. Enter the password to join.');
        return;
      }

      setJoinError(result.message);
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : 'Failed to join room');
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* 3-zone Top Bar Contract */}
      <AppHeader
        left={
          <a href="/" className="flex items-center gap-2.5 text-base font-bold tracking-tight text-foreground whitespace-nowrap shrink-0">
            <DropBridgeMark size={26} />
            <span>DropBridge</span>
          </a>
        }
        center={
          <nav aria-label="Primary navigation" className="flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <a href="#how-it-works" className="hover:text-foreground transition-colors whitespace-nowrap shrink-0">
              How it works
            </a>
            <a href="#formats" className="hover:text-foreground transition-colors whitespace-nowrap shrink-0">
              Supported formats
            </a>
            <button
              type="button"
              onClick={() => onNavigatePage('help')}
              className="hover:text-foreground transition-colors whitespace-nowrap shrink-0"
            >
              Help
            </button>
            <button
              type="button"
              onClick={() => onNavigatePage('privacy')}
              className="hover:text-foreground transition-colors whitespace-nowrap shrink-0"
            >
              Privacy
            </button>
          </nav>
        }
        right={
          <div className="flex items-center gap-2">
            <PWAInstallButton />
            <Button size="sm" disabled={creating} onClick={() => void handleQuickCreate()}>
              <PlusIcon size={15} />
              <span>{creating ? 'Creating...' : 'Create Room'}</span>
            </Button>
          </div>
        }
      />

      <main className="flex-1">
        <AppContainer className="py-10 sm:py-14">
          {/* Primary 2-column Hero Workspace */}
          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12 lg:gap-12">
            {/* Left: Brand & Create Room */}
            <div className="lg:col-span-7 space-y-6">
              <div className="space-y-3">
                <p className="text-xs font-semibold tracking-wide text-primary">
                  Connect. Share. Instantly.
                </p>
                <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl text-balance">
                  Instant file sharing between any phone, tablet, or computer.
                </h1>
                <p className="max-w-xl text-base text-muted-foreground leading-relaxed">
                  Create a private six-digit room in one click and stream documents, photos, videos, and snippets directly between active devices—zero file storage, no accounts, and no same-Wi-Fi requirement.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-surface p-6 space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-foreground">Start a Private Room</h2>
                    <p className="text-xs text-muted-foreground">
                      Detected device: {displayName} ({deviceInfo.operatingSystem} · {deviceInfo.browser})
                    </p>
                  </div>
                  <Button
                    size="lg"
                    disabled={creating}
                    onClick={() => void handleQuickCreate()}
                  >
                    <PlusIcon size={17} />
                    <span>{creating ? 'Creating Room...' : 'Create Room'}</span>
                  </Button>
                </div>

                <div className="border-t border-border pt-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateOptions((v) => !v)}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    {showCreateOptions ? 'Hide room options' : 'Customize room name, expiration, or password'}
                  </button>

                  {showCreateOptions && (
                    <form
                      onSubmit={createForm.handleSubmit(() => void handleQuickCreate())}
                      className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2"
                    >
                      <div className="space-y-1.5">
                        <Label htmlFor="create-room-name">Room Name</Label>
                        <Input
                          id="create-room-name"
                          maxLength={80}
                          {...createForm.register('roomName')}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="create-display-name">Your Device Name</Label>
                        <Input
                          id="create-display-name"
                          maxLength={64}
                          {...createForm.register('displayName')}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Expiration Duration</Label>
                        <Select
                          value={createForm.watch('durationMinutes')}
                          onValueChange={(v) => createForm.setValue('durationMinutes', v as CreateFormValues['durationMinutes'])}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="15">15 minutes</SelectItem>
                            <SelectItem value="30">30 minutes</SelectItem>
                            <SelectItem value="60">1 hour (Default)</SelectItem>
                            <SelectItem value="360">6 hours</SelectItem>
                            <SelectItem value="1440">24 hours</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="create-room-password" className="inline-flex items-center gap-1">
                          <LockIcon size={13} className="text-muted-foreground" />
                          <span>Optional Password</span>
                        </Label>
                        <Input
                          id="create-room-password"
                          type="password"
                          placeholder="Leave blank for open code"
                          {...createForm.register('password')}
                        />
                      </div>
                    </form>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldIcon size={15} className="text-success" />
                  Zero disk or database file storage
                </span>
                <span>·</span>
                <span>Single-session ephemeral rooms</span>
                <span>·</span>
                <span>Live Session Relay + Direct WebRTC P2P</span>
              </div>
            </div>

            {/* Right: Join Room Card */}
            <div className="lg:col-span-5">
              <div className="rounded-xl border border-border bg-surface p-6">
                <h2 className="text-base font-semibold text-foreground">Join an Existing Room</h2>
                <p className="mt-1 mb-5 text-xs text-muted-foreground">
                  Enter a six-digit room code or scan a QR code from another device.
                </p>
                <RoomJoinForm
                  initialCode={initialJoinCode}
                  requiresPassword={requiresPassword}
                  errorMessage={joinError}
                  isSubmitting={joining}
                  onSubmitJoin={handleJoinSubmit}
                />
              </div>
            </div>
          </div>

          {/* How It Works */}
          <section id="how-it-works" className="mt-16 border-t border-border pt-12">
            <h2 className="text-lg font-semibold text-foreground">How DropBridge Works</h2>
            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">01. Create or Scan</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Open a room to receive a cryptographically random six-digit code and QR invitation link.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">02. Share Files &amp; Previews</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Drag and drop files, capture photos, or paste clipboard images. Connected devices see new files immediately and can preview PDFs, Office docs, spreadsheets, media, and code inline.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">03. Automatic Cleanup</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Every room expires on schedule. Host controls let you lock rooms, require join approval, or terminate the session early.
                </p>
              </div>
            </div>
          </section>

          {/* Supported Formats */}
          <section id="formats" className="mt-12 border-t border-border pt-10">
            <h2 className="text-lg font-semibold text-foreground">Supported File Formats</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Transfer any file type, with built-in read-only previews for common documents and media.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              <div className="rounded-lg border border-border bg-surface p-3.5">
                <p className="font-semibold text-foreground">Documents</p>
                <p className="mt-1 text-xs text-muted-foreground">PDF, DOCX, TXT, MD, JSON, XML, source code</p>
              </div>
              <div className="rounded-lg border border-border bg-surface p-3.5">
                <p className="font-semibold text-foreground">Spreadsheets &amp; Slides</p>
                <p className="mt-1 text-xs text-muted-foreground">XLSX, XLS, CSV, TSV, PPTX, ODP</p>
              </div>
              <div className="rounded-lg border border-border bg-surface p-3.5">
                <p className="font-semibold text-foreground">Images &amp; Media</p>
                <p className="mt-1 text-xs text-muted-foreground">JPG, PNG, WebP, GIF, MP4, WebM, MP3, WAV</p>
              </div>
              <div className="rounded-lg border border-border bg-surface p-3.5">
                <p className="font-semibold text-foreground">Archives &amp; Binaries</p>
                <p className="mt-1 text-xs text-muted-foreground">ZIP, RAR, 7Z, TAR, GZ, installers</p>
              </div>
            </div>
          </section>
        </AppContainer>
      </main>

      <footer className="border-t border-border bg-surface py-6">
        <AppContainer className="flex flex-col items-center justify-between gap-3 text-xs text-muted-foreground sm:flex-row">
          <span>DropBridge — Real-time cross-device file sharing</span>
          <div className="flex items-center gap-5">
            <button type="button" onClick={() => onNavigatePage('privacy')} className="hover:text-foreground">
              Privacy Policy
            </button>
            <button type="button" onClick={() => onNavigatePage('help')} className="hover:text-foreground">
              Help &amp; Troubleshooting
            </button>
          </div>
        </AppContainer>
      </footer>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { ScanIcon, AlertIcon, LockIcon } from '@/src/components/common/StreamlineIcons';
import { QRCodeScanner } from '@/src/features/rooms/QRCodeScanner';
import { joinRoomSchema } from '@/src/lib/validation/schemas';
import { useSessionStore } from '@/src/stores/useSessionStore';
import type { z } from 'zod';

type JoinFormValues = z.infer<typeof joinRoomSchema>;

interface RoomJoinFormProps {
  initialCode?: string;
  disabled?: boolean;
  requiresPassword?: boolean;
  errorMessage?: string | null;
  isSubmitting?: boolean;
  onSubmitJoin: (values: JoinFormValues) => Promise<void>;
}

export function RoomJoinForm({
  initialCode = '',
  disabled = false,
  requiresPassword = false,
  errorMessage = null,
  isSubmitting = false,
  onSubmitJoin,
}: RoomJoinFormProps) {
  const displayName = useSessionStore((s) => s.displayName);
  const setDisplayName = useSessionStore((s) => s.setDisplayName);
  const deviceInfo = useSessionStore((s) => s.deviceInfo);
  const [scannerOpen, setScannerOpen] = useState(false);

  const form = useForm<JoinFormValues>({
    resolver: zodResolver(joinRoomSchema),
    defaultValues: {
      roomCode: initialCode,
      displayName,
      password: '',
    },
  });

  useEffect(() => {
    if (initialCode) {
      form.setValue('roomCode', initialCode);
    }
  }, [initialCode, form]);

  const handleSubmit = form.handleSubmit(async (values) => {
    setDisplayName(values.displayName);
    await onSubmitJoin(values);
  });

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="join-room-code">Six-Digit Room Code</Label>
          <button
            type="button"
            disabled={disabled}
            onClick={() => setScannerOpen(true)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline disabled:opacity-50"
          >
            <ScanIcon size={14} />
            <span>Scan QR Code</span>
          </button>
        </div>
        <Input
          id="join-room-code"
          inputMode="numeric"
          maxLength={6}
          placeholder="000000"
          disabled={disabled || isSubmitting}
          className="h-11 font-mono text-lg tracking-[0.25em] tabular-nums"
          {...form.register('roomCode', {
            onChange: (e) => {
              e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6);
            },
          })}
        />
        {form.formState.errors.roomCode && (
          <p className="text-xs text-destructive">{form.formState.errors.roomCode.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="join-display-name">Device Name</Label>
          <span className="text-xs text-muted-foreground">
            {deviceInfo.operatingSystem} · {deviceInfo.browser}
          </span>
        </div>
        <Input
          id="join-display-name"
          maxLength={64}
          placeholder="e.g. MacBook, iPhone"
          disabled={disabled || isSubmitting}
          {...form.register('displayName')}
        />
        {form.formState.errors.displayName && (
          <p className="text-xs text-destructive">{form.formState.errors.displayName.message}</p>
        )}
      </div>

      {requiresPassword && (
        <div className="space-y-1.5">
          <Label htmlFor="join-room-password" className="inline-flex items-center gap-1.5">
            <LockIcon size={14} className="text-muted-foreground" />
            <span>Room Password</span>
          </Label>
          <Input
            id="join-room-password"
            type="password"
            placeholder="Enter room password"
            disabled={disabled || isSubmitting}
            autoFocus
            {...form.register('password')}
          />
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive-subtle px-3 py-2.5 text-xs text-destructive"
        >
          <AlertIcon size={15} className="mt-0.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <Button type="submit" className="w-full" disabled={disabled || isSubmitting}>
        {isSubmitting ? 'Joining Room...' : 'Join Room'}
      </Button>

      <QRCodeScanner
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onCodeDetected={(code) => {
          form.setValue('roomCode', code, { shouldValidate: true });
        }}
      />
    </form>
  );
}

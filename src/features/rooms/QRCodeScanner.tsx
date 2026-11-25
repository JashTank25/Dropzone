import { useEffect, useId, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/src/components/ui/dialog';
import { Button } from '@/src/components/ui/button';
import { AlertIcon } from '@/src/components/common/StreamlineIcons';
import { extractRoomCodeFromInput } from '@/src/lib/validation/schemas';

interface QRCodeScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCodeDetected: (roomCode: string) => void;
}

export function QRCodeScanner({ open, onOpenChange, onCodeDetected }: QRCodeScannerProps) {
  const scannerId = useId().replace(/:/g, '_');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setCameraError(null);

    const startScanner = async () => {
      try {
        await new Promise((r) => setTimeout(r, 150));
        if (!active) return;
        const element = document.getElementById(scannerId);
        if (!element) return;

        const scanner = new Html5Qrcode(scannerId);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decodedText) => {
            const code = extractRoomCodeFromInput(decodedText);
            if (code) {
              onCodeDetected(code);
              onOpenChange(false);
            }
          },
          () => {
            // Ignore per-frame decode misses
          }
        );
      } catch (err) {
        if (!active) return;
        const msg = err instanceof Error ? err.message : '';
        if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('notallowed')) {
          setCameraError(
            'Camera permission was denied. Allow camera access in your browser settings or enter the 6-digit room code manually.'
          );
        } else {
          setCameraError(
            'No accessible camera was detected on this device. You can enter the 6-digit room code manually.'
          );
        }
      }
    };

    void startScanner();

    return () => {
      active = false;
      const current = scannerRef.current;
      scannerRef.current = null;
      if (current) {
        current
          .stop()
          .then(() => current.clear())
          .catch(() => {
            // Ignore cleanup errors if scanner did not start
          });
      }
    };
  }, [open, scannerId, onCodeDetected, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Scan Room QR Code</DialogTitle>
          <DialogDescription>
            Point your camera at a DropBridge invitation QR code to join automatically.
          </DialogDescription>
        </DialogHeader>

        {cameraError ? (
          <div className="mt-4 rounded-lg border border-warning/30 bg-warning-subtle p-4 text-sm text-foreground">
            <div className="flex items-start gap-2.5">
              <AlertIcon size={18} className="mt-0.5 text-warning" />
              <div className="space-y-2">
                <p className="font-medium">Camera Unavailable</p>
                <p className="text-muted-foreground">{cameraError}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4 overflow-hidden rounded-xl border border-border bg-surface-subtle">
            <div id={scannerId} className="min-h-[260px] w-full" />
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

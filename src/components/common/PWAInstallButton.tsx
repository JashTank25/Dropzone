import { useState } from 'react';
import { Button } from '@/src/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/src/components/ui/dialog';
import { DownloadIcon } from '@/src/components/common/StreamlineIcons';
import { usePWAInstall } from '@/src/hooks/usePWAInstall';

export function PWAInstallButton() {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <Button variant="outline" size="sm" onClick={() => void install()}>
        <DownloadIcon size={16} />
        <span>Install App</span>
      </Button>
    );
  }

  if (isIOS) {
    return (
      <>
        <Button variant="outline" size="sm" onClick={() => setShowIOSGuide(true)}>
          <DownloadIcon size={16} />
          <span>Install</span>
        </Button>
        <Dialog open={showIOSGuide} onOpenChange={setShowIOSGuide}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Install DropBridge on iOS</DialogTitle>
              <DialogDescription>
                Add DropBridge to your home screen for quick access and native share support.
              </DialogDescription>
            </DialogHeader>
            <ol className="mt-3 space-y-2 text-sm text-foreground list-decimal pl-5">
              <li>Tap the Share button in the Safari toolbar.</li>
              <li>Scroll down and choose Add to Home Screen.</li>
              <li>Tap Add to confirm installation.</li>
            </ol>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return null;
}

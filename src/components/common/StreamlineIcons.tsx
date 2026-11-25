import * as React from 'react';
import { cn } from '@/src/utils/cn';

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
}

function StreamlineSvg({
  size = 20,
  className,
  children,
  ...props
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.65}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('shrink-0', className)}
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function DropBridgeMark({ size = 24, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={cn('shrink-0', className)}
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="8" className="fill-primary" />
      <path d="M10 18.5C10 15.8 11.8 14 14.5 14H17.5C20.2 14 22 15.8 22 18.5" stroke="white" strokeWidth="2.1" strokeLinecap="round" />
      <path d="M16 8.5V19.5" stroke="white" strokeWidth="2.1" strokeLinecap="round" />
      <path d="M12.25 12.25L16 8.5L19.75 12.25" stroke="white" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="9.5" y="21.5" width="13" height="2.6" rx="1.3" fill="white" fillOpacity="0.92" />
    </svg>
  );
}

export function UploadIcon(props: IconProps) {
  return (
    <StreamlineSvg {...props}>
      <path d="M12 15V4" />
      <path d="M7.5 8.5L12 4l4.5 4.5" />
      <path d="M4 15.5v2.25A2.25 2.25 0 006.25 20h11.5A2.25 2.25 0 0020 17.75V15.5" />
    </StreamlineSvg>
  );
}

export function DownloadIcon(props: IconProps) {
  return (
    <StreamlineSvg {...props}>
      <path d="M12 4v11" />
      <path d="M7.5 10.5L12 15l4.5-4.5" />
      <path d="M4 15.5v2.25A2.25 2.25 0 006.25 20h11.5A2.25 2.25 0 0020 17.75V15.5" />
    </StreamlineSvg>
  );
}

export function FolderUploadIcon(props: IconProps) {
  return (
    <StreamlineSvg {...props}>
      <path d="M3.5 7.5A2 2 0 015.5 5.5h3.8l2 2h7.2a2 2 0 012 2v8a2 2 0 01-2 2h-13a2 2 0 01-2-2v-10z" />
      <path d="M12 16v-5" />
      <path d="M9.5 13.5L12 11l2.5 2.5" />
    </StreamlineSvg>
  );
}

export function CameraIcon(props: IconProps) {
  return (
    <StreamlineSvg {...props}>
      <path d="M4 8.5A2 2 0 016 6.5h2.2l1.3-2h5l1.3 2H18a2 2 0 012 2v8.5a2 2 0 01-2 2H6a2 2 0 01-2-2V8.5z" />
      <circle cx="12" cy="12.5" r="3" />
    </StreamlineSvg>
  );
}

export function QrCodeIcon(props: IconProps) {
  return (
    <StreamlineSvg {...props}>
      <rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1" />
      <rect x="14" y="3.5" width="6.5" height="6.5" rx="1" />
      <rect x="3.5" y="14" width="6.5" height="6.5" rx="1" />
      <path d="M14 14h2.5v2.5H14zM18.5 14h2v3h-2M14 18.5h3.5v2M19 20.5h1.5" />
    </StreamlineSvg>
  );
}

export function ScanIcon(props: IconProps) {
  return (
    <StreamlineSvg {...props}>
      <path d="M4 8V5.5A1.5 1.5 0 015.5 4H8M16 4h2.5A1.5 1.5 0 0120 5.5V8M20 16v2.5a1.5 1.5 0 01-1.5 1.5H16M8 20H5.5A1.5 1.5 0 014 18.5V16" />
      <path d="M6.5 12h11" />
    </StreamlineSvg>
  );
}

export function CopyIcon(props: IconProps) {
  return (
    <StreamlineSvg {...props}>
      <rect x="8.5" y="8.5" width="11" height="11" rx="2" />
      <path d="M15.5 8.5V6.5a2 2 0 00-2-2h-7a2 2 0 00-2 2v7a2 2 0 002 2h2" />
    </StreamlineSvg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <StreamlineSvg {...props}>
      <path d="M4.5 12.5l5 5 10-10" />
    </StreamlineSvg>
  );
}

export function ShareIcon(props: IconProps) {
  return (
    <StreamlineSvg {...props}>
      <circle cx="17.5" cy="5.5" r="2.25" />
      <circle cx="6.5" cy="12" r="2.25" />
      <circle cx="17.5" cy="18.5" r="2.25" />
      <path d="M8.5 10.9l7-4.3M8.5 13.1l7 4.3" />
    </StreamlineSvg>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <StreamlineSvg {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1.08-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1.08 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9c.26.6.85 1 1.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </StreamlineSvg>
  );
}

export function LockIcon(props: IconProps) {
  return (
    <StreamlineSvg {...props}>
      <rect x="4.5" y="10.5" width="15" height="9.5" rx="2" />
      <path d="M8 10.5V7.5a4 4 0 018 0v3" />
    </StreamlineSvg>
  );
}

export function UnlockIcon(props: IconProps) {
  return (
    <StreamlineSvg {...props}>
      <rect x="4.5" y="10.5" width="15" height="9.5" rx="2" />
      <path d="M8 10.5V7.5a4 4 0 017.6-1.7" />
    </StreamlineSvg>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <StreamlineSvg {...props}>
      <path d="M4.5 6.5h15M9.5 6.5V4.5a1 1 0 011-1h3a1 1 0 011 1v2M6.5 6.5l.8 12.5a1.5 1.5 0 001.5 1.5h6.4a1.5 1.5 0 001.5-1.5l.8-12.5" />
      <path d="M10 10.5v6M14 10.5v6" />
    </StreamlineSvg>
  );
}

export function EyeIcon(props: IconProps) {
  return (
    <StreamlineSvg {...props}>
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z" />
      <circle cx="12" cy="12" r="2.75" />
    </StreamlineSvg>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <StreamlineSvg {...props}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M15.5 15.5L20 20" />
    </StreamlineSvg>
  );
}

export function GridViewIcon(props: IconProps) {
  return (
    <StreamlineSvg {...props}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
    </StreamlineSvg>
  );
}

export function ListViewIcon(props: IconProps) {
  return (
    <StreamlineSvg {...props}>
      <path d="M8 6.5h12M8 12h12M8 17.5h12" />
      <circle cx="4.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="4.5" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="4.5" cy="17.5" r="1" fill="currentColor" stroke="none" />
    </StreamlineSvg>
  );
}

export function ChatIcon(props: IconProps) {
  return (
    <StreamlineSvg {...props}>
      <path d="M20 11.5a7.5 7.5 0 01-10.7 6.8L4 20l1.7-5A7.5 7.5 0 1120 11.5z" />
    </StreamlineSvg>
  );
}

export function SendIcon(props: IconProps) {
  return (
    <StreamlineSvg {...props}>
      <path d="M20.5 3.5L10 14" />
      <path d="M20.5 3.5l-6.5 17-4-6.5-6.5-4 17-6.5z" />
    </StreamlineSvg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <StreamlineSvg {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </StreamlineSvg>
  );
}

export function MoreVerticalIcon(props: IconProps) {
  return (
    <StreamlineSvg {...props}>
      <circle cx="12" cy="5.5" r="1.25" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.25" fill="currentColor" stroke="none" />
      <circle cx="12" cy="18.5" r="1.25" fill="currentColor" stroke="none" />
    </StreamlineSvg>
  );
}

export function RefreshIcon(props: IconProps) {
  return (
    <StreamlineSvg {...props}>
      <path d="M20 11a8 8 0 00-14.6-4.5L4 8" />
      <path d="M4 3.5V8h4.5" />
      <path d="M4 13a8 8 0 0014.6 4.5L20 16" />
      <path d="M20 20.5V16h-4.5" />
    </StreamlineSvg>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <StreamlineSvg {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </StreamlineSvg>
  );
}

export function ShieldIcon(props: IconProps) {
  return (
    <StreamlineSvg {...props}>
      <path d="M12 3.5l7.5 3v5.2c0 4.6-3.2 8.2-7.5 9.3-4.3-1.1-7.5-4.7-7.5-9.3V6.5l7.5-3z" />
      <path d="M9.2 12l2 2 3.8-4" />
    </StreamlineSvg>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <StreamlineSvg {...props}>
      <path d="M12 5v14M5 12h14" />
    </StreamlineSvg>
  );
}

export function AlertIcon(props: IconProps) {
  return (
    <StreamlineSvg {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 8.5v4.5M12 16h.01" />
    </StreamlineSvg>
  );
}

export function InfoIcon(props: IconProps) {
  return (
    <StreamlineSvg {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5M12 8h.01" />
    </StreamlineSvg>
  );
}

export function BoltIcon(props: IconProps) {
  return (
    <StreamlineSvg {...props}>
      <path d="M13 3L5.5 13.5H12L11 21l7.5-10.5H12L13 3z" />
    </StreamlineSvg>
  );
}

export function RotateIcon(props: IconProps) {
  return (
    <StreamlineSvg {...props}>
      <path d="M20 12a8 8 0 11-2.3-5.6L20 8.5" />
      <path d="M20 4v4.5h-4.5" />
    </StreamlineSvg>
  );
}

export function ZoomInIcon(props: IconProps) {
  return (
    <StreamlineSvg {...props}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M15.5 15.5L20 20M8 10.5h5M10.5 8v5" />
    </StreamlineSvg>
  );
}

export function ZoomOutIcon(props: IconProps) {
  return (
    <StreamlineSvg {...props}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M15.5 15.5L20 20M8 10.5h5" />
    </StreamlineSvg>
  );
}

export function WifiOffIcon(props: IconProps) {
  return (
    <StreamlineSvg {...props}>
      <path d="M3.5 3.5l17 17" />
      <path d="M8.5 16.5a5 5 0 017 0M5.2 12.6a9.5 9.5 0 013.6-2.3M15.2 10.3a9.5 9.5 0 013.6 2.3" />
      <circle cx="12" cy="19" r="1" fill="currentColor" stroke="none" />
    </StreamlineSvg>
  );
}

export function MobileDeviceIcon(props: IconProps) {
  return (
    <StreamlineSvg {...props}>
      <rect x="6.5" y="3" width="11" height="18" rx="2" />
      <path d="M10.5 17.5h3" />
    </StreamlineSvg>
  );
}

export function TabletDeviceIcon(props: IconProps) {
  return (
    <StreamlineSvg {...props}>
      <rect x="4.5" y="3" width="15" height="18" rx="2" />
      <path d="M10.5 17.5h3" />
    </StreamlineSvg>
  );
}

export function DesktopDeviceIcon(props: IconProps) {
  return (
    <StreamlineSvg {...props}>
      <rect x="3" y="4" width="18" height="12.5" rx="1.75" />
      <path d="M8.5 20h7M12 16.5V20" />
    </StreamlineSvg>
  );
}

export function DevicesIcon(props: IconProps) {
  return (
    <StreamlineSvg {...props}>
      <rect x="3" y="5" width="12" height="9" rx="1.5" />
      <path d="M6.5 17h5M9 14v3" />
      <rect x="15" y="8" width="6" height="11" rx="1.25" />
    </StreamlineSvg>
  );
}

export function TransferIcon(props: IconProps) {
  return (
    <StreamlineSvg {...props}>
      <path d="M7 16V4M7 4L3.5 7.5M7 4l3.5 3.5" />
      <path d="M17 8v12M17 20l-3.5-3.5M17 20l3.5-3.5" />
    </StreamlineSvg>
  );
}

export function DocFileIcon(props: IconProps) {
  return (
    <StreamlineSvg {...props}>
      <path d="M6 3.5h8l4 4v13a1.5 1.5 0 01-1.5 1.5h-10A1.5 1.5 0 015 20.5V5A1.5 1.5 0 016 3.5z" />
      <path d="M14 3.5v4h4M8.5 12h7M8.5 15.5h5" />
    </StreamlineSvg>
  );
}

export function SheetFileIcon(props: IconProps) {
  return (
    <StreamlineSvg {...props}>
      <path d="M6 3.5h8l4 4v13a1.5 1.5 0 01-1.5 1.5h-10A1.5 1.5 0 015 20.5V5A1.5 1.5 0 016 3.5z" />
      <rect x="8" y="11" width="8" height="6" rx="0.75" />
      <path d="M12 11v6M8 14h8" />
    </StreamlineSvg>
  );
}

export function SlideFileIcon(props: IconProps) {
  return (
    <StreamlineSvg {...props}>
      <rect x="3.5" y="4.5" width="17" height="12" rx="1.5" />
      <path d="M12 16.5V20M8.5 20h7M8.5 10.5l2.5-2.5 2.5 2 2.5-2.5" />
    </StreamlineSvg>
  );
}

export function ImageFileIcon(props: IconProps) {
  return (
    <StreamlineSvg {...props}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.25" />
      <path d="M5 17l4.5-4.5 3 3 2.5-2.5L20 17" />
    </StreamlineSvg>
  );
}

export function VideoFileIcon(props: IconProps) {
  return (
    <StreamlineSvg {...props}>
      <rect x="3.5" y="5" width="17" height="14" rx="2" />
      <path d="M10 9.5l5 2.5-5 2.5v-5z" />
    </StreamlineSvg>
  );
}

export function AudioFileIcon(props: IconProps) {
  return (
    <StreamlineSvg {...props}>
      <path d="M9 17.5V7l9-2v10.5" />
      <circle cx="7" cy="17.5" r="2" />
      <circle cx="16" cy="15.5" r="2" />
    </StreamlineSvg>
  );
}

export function ArchiveFileIcon(props: IconProps) {
  return (
    <StreamlineSvg {...props}>
      <rect x="4.5" y="4" width="15" height="16" rx="2" />
      <path d="M12 4v16M10.5 7.5h3M10.5 11h3M10.5 14.5h3" />
    </StreamlineSvg>
  );
}

export function GenericFileIcon(props: IconProps) {
  return (
    <StreamlineSvg {...props}>
      <path d="M6 3.5h8l4 4v13a1.5 1.5 0 01-1.5 1.5h-10A1.5 1.5 0 015 20.5V5A1.5 1.5 0 016 3.5z" />
      <path d="M14 3.5v4h4" />
    </StreamlineSvg>
  );
}

# DropBridge — Real-Time Ephemeral File Sharing

**Connect. Share. Instantly.**

DropBridge is a responsive Progressive Web App for single-session cross-device file sharing using private six-digit room codes, built with React, TypeScript, Tailwind CSS, Zustand, TanStack Query, and an ephemeral Express + WebSocket (`ws`) relay server with zero disk or database storage.

## Features

- **Zero-Storage Single-Session Architecture**: No database, no cloud storage buckets, and no files written to server disk. Room state lives strictly in volatile RAM and shared files remain in the sender's browser memory.
- **Instant Private Rooms**: One-click 6-digit numeric room creation, QR invitation links, native device share, optional `scrypt`-hashed room passwords, and rate-limited join attempts.
- **Live Session Relay & Direct WebRTC P2P**: Unbuffered live HTTP stream piping from sender to receiver (`file:pull` + `/api/streams/:streamId`), real transfer progress/speed/ETA, cancellation, multi-file ZIP downloads, and optional WebRTC `RTCDataChannel` transfers.
- **Read-Only File Previews**: Lazy-loaded PDF.js canvas viewer, Excel (`read-excel-file`) and RFC-4180 CSV/TSV multi-sheet tables, DOMPurify-sanitized DOCX rendering via Mammoth, image zoom/rotation, formatted JSON/code, and audio/video playback.
- **Host Controls & Room Chat**: Live WebSocket presence device list, manual join approval, lock/unlock, transfer host, extend duration, end room, and real-time room chat with typing indicators.
- **Installable PWA**: Web App Manifest, service worker (`NetworkOnly` for `/api/` endpoints), offline indicator, and Web Share Target support.

## Local Development

```bash
cp .env.example .env

npm install
npm run dev
```

The Express + WebSocket + Vite dev server runs on port `3000`.

## Testing & Verification

```bash
npm run lint
npm test
npm run build
```

## Production Start

```bash
npm run build
NODE_ENV=production npm start
```

Optional environment variables:
- `PORT` (defaults to `3000`)
- `VITE_MAX_FILE_SIZE_MB` (defaults to `250`)
- `VITE_TURN_URL`, `VITE_TURN_USERNAME`, `VITE_TURN_CREDENTIAL` (optional WebRTC TURN relay)

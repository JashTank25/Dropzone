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
npm install
npm run dev
```

The Express + WebSocket + Vite dev server runs on port `3000`.

## Deployment

DropBridge requires a persistent Node.js server (`server.ts`) because rooms, live file stream pipes, and WebSockets (`/ws`) run in volatile server memory. Static-only hosting (such as Vercel alone without a backend) cannot handle `/api/*` POST requests or `/ws` WebSockets and will return HTTP 405.

### Option 1: Single Full-Stack Host (Recommended — Render, Railway, Fly.io, Cloud Run)
- **Build Command**: `npm install && npm run build`
- **Start Command**: `NODE_ENV=production npm start`
- **Environment Variables**: `PORT=3000` (or platform-injected `PORT`)

### Option 2: Vercel Frontend + Separate Node.js Backend
1. Deploy the repository as a Node web service on Render / Railway / Cloud Run using `npm run build` and `NODE_ENV=production npm start`, and set `CORS_ORIGIN=https://your-vercel-domain.vercel.app`.
2. In your Vercel project environment variables, set `VITE_API_BASE_URL=https://your-node-backend-url` and redeploy.

## Testing & Verification

```bash
npm run lint
npm test
npm run build
```

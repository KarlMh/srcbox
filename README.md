# srcbox

A minimal, local-first markdown notes app. Notes are stored as plain `.md` files on your filesystem — no cloud, no accounts, no lock-in.

## Features

- Write in Markdown with live preview
- Organize with folders and tags
- Instant autosave
- Search by title, content, or tag
- Light and dark mode
- Sync across devices with [Syncthing](https://syncthing.net)
- Desktop app (Electron) for Linux, macOS, Windows
- Installable as a PWA on mobile

## Quick Start

```bash
npm install
npm run dev
```

## Desktop App

```bash
# Development
npm run electron:dev

# Build
npm run electron:build:linux   # Linux (Flatpak, AppImage, deb)
npm run electron:build:mac
npm run electron:build:win
```

## Sync

srcbox stores notes as plain markdown files. Sync them across devices for free using [Syncthing](https://syncthing.net) — see the Sync section in the app's Settings page for step-by-step instructions.

## Tech Stack

- React 18 + TypeScript
- Vite
- Tailwind CSS
- Zustand
- Electron

## License

MIT

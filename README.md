# srcbox

A minimal, local-first markdown notes app that works everywhere from a single web codebase.

## Features

- **Local-first**: All notes stored locally in your browser using PouchDB
- **Markdown support**: Write in markdown with live preview
- **Instant autosave**: Never lose your work
- **Search**: Find notes by title, content, or tags
- **Organization**: Pin, favorite, archive, and tag notes
- **Dark mode**: Easy on the eyes
- **Responsive**: Works on desktop, tablet, and mobile
- **Sync optional**: Sync across devices with CouchDB (self-hostable)
- **Export/Import**: Backup and restore your notes
- **Desktop app**: Electron wrapper for Windows, macOS, and Linux
- **PWA**: Install as a mobile app

## Quick Start

### Web App

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Desktop App (Electron)

```bash
# Development
npm run electron:dev

# Build for your platform
npm run electron:build:linux   # Linux
npm run electron:build:mac     # macOS
npm run electron:build:win     # Windows
```

## Self-Hosted Sync

Set up your own CouchDB server for syncing notes across devices.

### Using Docker (Recommended)

1. Start CouchDB:

```bash
cd docker
docker-compose up -d
```

2. Open CouchDB admin panel at `http://localhost:5984/_utils`

3. Create a database named `srcbox`

4. In srcbox, go to Settings and enter:
   - CouchDB URL: `http://localhost:5984/srcbox`
   - Enable sync: ✓

### Manual CouchDB Setup

1. Install CouchDB 3.x
2. Enable CORS in `local.ini`:

```ini
[chttpd]
enable_cors = true

[cors]
origins = app://-, http://localhost, http://localhost:5173
credentials = true
headers = accept, authorization, content-type, origin, referer
methods = GET, PUT, POST, HEAD, DELETE
max_age = 3600
```

3. Create a database: `curl -X PUT http://admin:password@localhost:5984/srcbox`

## Project Structure

```
srcbox/
├── src/
│   ├── components/          # UI components
│   │   ├── layout/          # Layout components
│   │   ├── notes/           # Note-related components
│   │   ├── editor/          # Markdown editor
│   │   └── modals/          # Modal dialogs
│   ├── pages/               # Page components
│   ├── stores/              # Zustand state stores
│   ├── db/                  # PouchDB database layer
│   ├── types/               # TypeScript types
│   └── utils/               # Utility functions
├── electron/                # Electron main process
├── docker/                  # Docker setup for CouchDB
├── public/                  # Static assets
└── package.json
```

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **PouchDB** - Local database
- **Zustand** - State management
- **React Router** - Routing
- **React Markdown** - Markdown rendering
- **Lucide React** - Icons
- **Electron** - Desktop wrapper
- **PWA** - Mobile installability

## Keyboard Shortcuts

- `Ctrl/Cmd + N` - New note (in Electron)
- `Ctrl/Cmd + Shift + E` - Export notes (in Electron)
- `Ctrl/Cmd + Shift + I` - Import notes (in Electron)

## Data Model

Each note contains:

```typescript
interface Note {
  _id: string;           // Unique identifier
  _rev?: string;         // PouchDB revision
  title: string;         // Note title
  content: string;       // Markdown content
  tags: string[];        // Tags for organization
  pinned: boolean;       // Pinned to top
  favorited: boolean;    // Marked as favorite
  archived: boolean;     // Archived
  deletedAt: string | null; // Soft delete timestamp
  createdAt: string;     // Creation timestamp
  updatedAt: string;     // Last update timestamp
  type: 'note';          // Document type
}
```

## Sync Behavior

- **Local-first**: All changes saved immediately to local PouchDB
- **Background sync**: Continuous replication when online and configured
- **Conflict resolution**: Last-write-wins for simple fields
- **Offline support**: Full functionality without network

## Browser Support

- Chrome/Edge 90+
- Firefox 90+
- Safari 15+
- Mobile browsers with PWA support

## Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Setup

```bash
git clone https://github.com/your-username/srcbox.git
cd srcbox
npm install
npm run dev
```

### Linting

```bash
npm run lint
npm run format
```

## Building

### Web

```bash
npm run build
```

Output in `dist/` directory.

### Desktop

```bash
# All platforms
npm run electron:build

# Specific platform
npm run electron:build:linux
npm run electron:build:mac
npm run electron:build:win
```

Output in `release/` directory.

## PWA

The app is a Progressive Web App:

- Installable on mobile devices
- Works offline
- Fast loading with service worker caching

## License

MIT License - see [LICENSE](LICENSE) file.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## Roadmap

- [ ] Command palette
- [ ] Split view (edit/preview)
- [ ] Word count / reading time
- [ ] Recent notes
- [ ] Export as ZIP
- [ ] Note templates
- [ ] Keyboard shortcuts for web
- [ ] End-to-end encryption for sync

## Acknowledgments

Inspired by Bear, Simplenote, Obsidian, and Linear.
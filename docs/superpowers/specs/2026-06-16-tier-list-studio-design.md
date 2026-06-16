# Tier List Studio Design

## Goal

Build `Tier List Studio`, a local-first desktop app for creating polished, creator-grade tier lists. The first delivery is one complete v1 build, accepted on Windows with an unsigned NSIS installer, while preserving cross-platform architecture for macOS and Linux packaging.

## Source Of Truth

The project requirements come from `Tier List Studio Desktop Specification.pdf`, plus these clarified decisions:

- Build the full PDF-defined v1 in one build.
- Use Windows as the primary acceptance target, with cross-platform-safe implementation.
- Standardize on `pnpm`.
- Copy imported media into app-managed storage under `userData/tier-list-studio/assets/`.
- Implement AI as provider abstraction plus settings UI; no default provider is required.
- Scope undo/redo to the current editor session only.
- Export PNG/JPEG from the current on-screen board appearance.
- Ship starter templates and support user-created templates.
- Use a polished creator-tool visual direction.
- Produce an unsigned Windows installer for v1.

## Architecture

Use Electron with a privileged main process, a context-isolated renderer, and a preload bridge that exposes a narrow typed API. The renderer must not access Node APIs, SQLite, raw filesystem APIs, or `ipcRenderer` directly. Main-process IPC handlers validate all incoming payloads with Zod before delegating to services.

The stack is:

- Electron
- React + TypeScript + Vite
- `pnpm`
- `better-sqlite3`
- `dnd-kit`
- Zod
- Vitest
- Playwright
- electron-builder

## Process Boundaries

Main process responsibilities:

- Window creation and lifecycle.
- SQLite connection, migrations, repositories, and transactions.
- File dialogs.
- Media import, hashing, copying, thumbnail generation, and video poster generation.
- Export, backup, restore, and package creation.
- Settings, templates, snapshots, AI provider configuration, and update stubs.

Preload responsibilities:

- Expose `window.tierStudio` with typed domains for app, dialogs, workspaces, lists, rows, items, positions, templates, snapshots, exports, backups, settings, and AI.
- Hide IPC channel names from renderer code.
- Return promises for request/response actions only.

Renderer responsibilities:

- Dashboard, editor, settings, and theme studio views.
- Board layout, item pool, add-items modal, drag-and-drop, keyboard reordering, presentation FX, and current-session undo/redo.
- Client-side state orchestration around the typed preload API.

## Persistence And Storage

Store all runtime data in `[userData]/tier-list-studio/`. Use SQLite in WAL mode with `foreign_keys=ON`, `synchronous=NORMAL`, and `busy_timeout=5000`. Use the schema defined in the PDF, including STRICT tables, JSON text columns, FTS5 search, and indexes.

Use this managed storage shape:

```text
[userData]/tier-list-studio/
  data/
  assets/
    originals/
    thumbs/
    posters/
  exports/
  backups/
  logs/
  temp/
```

Imported images and videos are copied into `assets/originals/` by content hash. Thumbnails and posters are generated into managed folders. The app should not depend on the original source path after import.

## Product Surface

The app opens to a dashboard with create blank, create from template, and recent list entry points. The editor has a top command bar, title/meta strip, central tier board, right item pool/library, and bottom utility rail.

Rows default to S, A, B, C, and D. Rows are editable: add, remove, reorder, relabel, recolor, resize, set max item limit, and collapse. Items support text-only, image-only, mixed image+text, and video-poster+text cards.

The Add Items modal includes Text, Images, Video, Search, and AI tabs. The AI tab is disabled until provider settings are configured.

## Visual Direction

Use a dark-theme-first polished creator-tool style with strong board hierarchy, expressive cards, refined motion, and optional presentation effects. Theme data is driven by CSS custom properties and persisted in JSON style fields, not hard-coded into isolated CSS classes.

Ship starter theme/template presets. Include optional effects such as drop glow, row pulse, light/heavy shake presets, S-tier celebration, and comic callouts. Effects must be disabled or reduced through preferences.

## Accessibility

All core editor workflows must work by keyboard:

- Tab reaches all controls and draggable items.
- Space or Enter picks up and drops an item.
- Arrow keys move a grabbed item between rows and positions.
- Escape cancels drag.
- Dialogs trap focus and restore focus on close.
- Icon-only buttons have accessible names.
- Drag movement emits live announcements.

## Export, Backup, And Packaging

Image export captures the current board appearance. JSON package export includes list data and managed asset references. CSV export summarizes rows and items. Backup/restore covers database and managed assets, using a consistent backup strategy rather than raw copying a live database.

Packaging uses electron-builder. V1 acceptance requires an unsigned Windows NSIS installer. The configuration should also define macOS DMG and Linux AppImage targets so cross-platform packaging remains available after Windows acceptance.

## Testing Strategy

Use Vitest for shared logic, repositories, schema helpers, serializers, and service-level behavior. Use Playwright for critical app flows: create list, add items, drag by mouse, reorder by keyboard, save/reopen, duplicate, template creation, snapshot restore, export, backup/restore, and installer smoke checks where practical.

## Non-Goals

V1 excludes remote authentication, cloud sync, public sharing, collaboration, comments, billing, and signed release automation.

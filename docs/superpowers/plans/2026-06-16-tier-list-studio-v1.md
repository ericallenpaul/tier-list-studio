# Tier List Studio V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full local-first Tier List Studio Electron desktop app and produce an unsigned Windows NSIS installer.

**Architecture:** Electron owns privileged work in the main process, React renders the app in a context-isolated renderer, and a typed preload bridge mediates all privileged actions. SQLite lives only in main process services, with Zod validation at the IPC boundary and `dnd-kit` powering accessible drag-and-drop.

**Tech Stack:** Electron, React, TypeScript, Vite, pnpm, better-sqlite3, dnd-kit, Zod, Vitest, Playwright, electron-builder.

---

## File Structure

Create this structure during implementation:

```text
src/
  main/
    index.ts
    windows/createMainWindow.ts
    services/
      db/connection.ts
      db/migrations.ts
      db/schema.sql
      repositories/
      assets/assetImportService.ts
      assets/thumbnailService.ts
      assets/videoPosterService.ts
      exports/exportImageService.ts
      exports/exportPackageService.ts
      exports/exportCsvService.ts
      backups/backupService.ts
      settings/settingsService.ts
      templates/templateService.ts
      ai/aiProviderManager.ts
    ipc/registerHandlers.ts
  preload/
    index.ts
    api.ts
    channelTypes.ts
  renderer/
    main.tsx
    App.tsx
    routes/DashboardPage.tsx
    routes/EditorPage.tsx
    routes/SettingsPage.tsx
    components/
    features/
    store/
    styles/tokens.css
    styles/globals.css
  shared/
    contracts/
    schemas/
    models/
    utils/
tests/
  unit/
  integration/
  e2e/
```

## Task 1: Project Scaffold And Tooling

**Files:**
- Create: `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `electron-builder.yml`
- Create: `src/main/index.ts`, `src/preload/index.ts`, `src/renderer/main.tsx`, `src/renderer/App.tsx`

- [ ] Initialize a pnpm Electron + Vite + React + TypeScript project.
- [ ] Add scripts: `dev`, `build`, `test`, `test:e2e`, `lint`, `typecheck`, `package:win`.
- [ ] Configure `packageManager` for pnpm in `package.json`.
- [ ] Configure electron-builder for unsigned Windows NSIS plus macOS DMG and Linux AppImage targets.
- [ ] Run `pnpm install`.
- [ ] Run `pnpm typecheck`; expected: pass.
- [ ] Commit with `git commit -m "Scaffold Electron app"`.

## Task 2: Secure Electron Shell

**Files:**
- Create: `src/main/windows/createMainWindow.ts`
- Modify: `src/main/index.ts`
- Modify: `src/preload/index.ts`

- [ ] Create one main BrowserWindow with `contextIsolation: true`, `nodeIntegration: false`, and a preload script.
- [ ] Add app lifecycle handling for Windows and cross-platform close/activate behavior.
- [ ] Expose only `window.tierStudio.app.getVersion()` from preload as the first bridge method.
- [ ] Add a smoke test that the renderer can read the app version but cannot access Node globals.
- [ ] Run `pnpm test`; expected: pass.
- [ ] Commit with `git commit -m "Add secure Electron shell"`.

## Task 3: Shared Contracts And Validation

**Files:**
- Create: `src/shared/models/*.ts`
- Create: `src/shared/schemas/*.ts`
- Create: `src/shared/contracts/tierStudioApi.ts`
- Create: `src/preload/api.ts`, `src/preload/channelTypes.ts`
- Create: `src/main/ipc/registerHandlers.ts`

- [ ] Define TypeScript models for workspaces, lists, rows, items, positions, assets, templates, snapshots, settings, exports, backups, and AI providers.
- [ ] Define Zod schemas for all create/update/move/export/import inputs.
- [ ] Define the typed `TierStudioApi` contract matching the PDF domains.
- [ ] Add IPC registration helpers that parse input with Zod before calling service functions.
- [ ] Add unit tests for invalid payload rejection and valid payload parsing.
- [ ] Run `pnpm test`; expected: pass.
- [ ] Commit with `git commit -m "Define typed IPC contracts"`.

## Task 4: SQLite Persistence Foundation

**Files:**
- Create: `src/main/services/db/schema.sql`
- Create: `src/main/services/db/connection.ts`
- Create: `src/main/services/db/migrations.ts`
- Create: `src/main/services/repositories/*.ts`
- Create: `tests/unit/db/*.test.ts`

- [ ] Implement the PDF schema with STRICT tables, JSON text columns, indexes, and FTS5 search.
- [ ] Open SQLite only in the main process with `foreign_keys=ON`, WAL, `synchronous=NORMAL`, and `busy_timeout=5000`.
- [ ] Implement migration runner and idempotent seed behavior for default workspace, themes, and starter templates.
- [ ] Implement repositories for settings, workspaces, lists, rows, items, positions, assets, templates, snapshots, export history, and search.
- [ ] Add repository tests using a temporary database.
- [ ] Run `pnpm test tests/unit/db`; expected: pass.
- [ ] Commit with `git commit -m "Add SQLite persistence layer"`.

## Task 5: Core List Services And IPC

**Files:**
- Create: `src/main/services/lists/listService.ts`
- Create: `src/main/services/positions/positionService.ts`
- Modify: `src/main/ipc/registerHandlers.ts`
- Create: `tests/integration/core-list-flow.test.ts`

- [ ] Implement workspace/list CRUD, duplicate as remix, archive, row CRUD/reorder, text item batch insert, item update/remove, item move, and position normalization.
- [ ] Maintain transactional consistency when moving multiple items.
- [ ] Update FTS rows after list, item, and template changes.
- [ ] Wire services through validated IPC handlers and preload methods.
- [ ] Add integration tests for create list, add text items, move to tier, duplicate list, search, and reopen from DB.
- [ ] Run `pnpm test tests/integration/core-list-flow.test.ts`; expected: pass.
- [ ] Commit with `git commit -m "Implement core list services"`.

## Task 6: Managed Media Import

**Files:**
- Create: `src/main/services/assets/assetImportService.ts`
- Create: `src/main/services/assets/thumbnailService.ts`
- Create: `src/main/services/assets/videoPosterService.ts`
- Modify: `src/main/ipc/registerHandlers.ts`
- Create: `tests/integration/media-import.test.ts`

- [ ] Copy imported images and videos into `[userData]/tier-list-studio/assets/originals/` using SHA-256 naming.
- [ ] Generate image thumbnails into `assets/thumbs/`.
- [ ] Generate video poster images into `assets/posters/`.
- [ ] Create image-only, video-poster, or mixed item records linked to media assets.
- [ ] Preserve original file name and metadata in SQLite, but do not depend on original source path after import.
- [ ] Add tests for duplicate asset import, missing source file errors, and item creation.
- [ ] Run `pnpm test tests/integration/media-import.test.ts`; expected: pass.
- [ ] Commit with `git commit -m "Add managed media import"`.

## Task 7: Dashboard And Editor UI

**Files:**
- Create: `src/renderer/routes/DashboardPage.tsx`
- Create: `src/renderer/routes/EditorPage.tsx`
- Create: `src/renderer/components/layout/*`
- Create: `src/renderer/features/dashboard/*`
- Create: `src/renderer/features/editor/*`
- Create: `src/renderer/store/editorStore.ts`

- [ ] Build dashboard entry points: blank list, starter template, recent lists.
- [ ] Build editor layout: top command bar, metadata strip, central board, right item pool, and bottom utility rail.
- [ ] Add current-session undo/redo for editor actions using renderer state history and persisted service calls.
- [ ] Add loading, empty, error, and autosave states.
- [ ] Add Playwright e2e test for create blank list, add text items, autosave, close/reopen.
- [ ] Run `pnpm test:e2e`; expected: pass for the dashboard/editor smoke flow.
- [ ] Commit with `git commit -m "Build dashboard and editor shell"`.

## Task 8: Accessible Drag-And-Drop Board

**Files:**
- Create: `src/renderer/components/board/*`
- Create: `src/renderer/components/rows/*`
- Create: `src/renderer/components/items/*`
- Modify: `src/renderer/features/editor/*`
- Create: `tests/e2e/drag-and-keyboard.spec.ts`

- [ ] Use `dnd-kit` for mouse and keyboard drag behavior.
- [ ] Support pool-to-tier, tier-to-tier, tier-to-pool, and intra-container reordering.
- [ ] Implement keyboard controls: Tab, Space/Enter, arrows, Escape.
- [ ] Add live announcements for item moves.
- [ ] Add context menu actions with keyboard equivalents: edit, duplicate, lock, send to pool, clear tier.
- [ ] Add e2e tests for mouse drag and keyboard reordering.
- [ ] Run `pnpm test:e2e tests/e2e/drag-and-keyboard.spec.ts`; expected: pass.
- [ ] Commit with `git commit -m "Add accessible tier board interactions"`.

## Task 9: Add Items Modal And Item Editing

**Files:**
- Create: `src/renderer/components/dialogs/AddItemsDialog.tsx`
- Create: `src/renderer/features/editor/itemEditing/*`
- Modify: `src/main/services/lists/listService.ts`
- Modify: `src/main/services/assets/assetImportService.ts`

- [ ] Implement Add Items tabs: Text, Images, Video, Search, AI.
- [ ] Keep AI tab disabled until provider settings are configured.
- [ ] Support inline card editing for label, subtitle, note, tags, accent color, and badge.
- [ ] Support multi-select, sort, filter, bulk relabel, and send back to pool in the right dock.
- [ ] Add tests for text batch parsing, image/video import flow, local search, and disabled AI state.
- [ ] Run `pnpm test` and `pnpm test:e2e`; expected: pass.
- [ ] Commit with `git commit -m "Implement item creation and editing"`.

## Task 10: Theme Studio And Presentation FX

**Files:**
- Create: `src/renderer/features/themeStudio/*`
- Create: `src/renderer/styles/tokens.css`
- Create: `src/renderer/styles/globals.css`
- Create: `src/renderer/features/editor/presentationFx/*`
- Modify: `src/main/services/settings/settingsService.ts`

- [ ] Implement CSS custom property token layers for core, semantic, board, and FX tokens.
- [ ] Add theme studio controls for app theme, board background, row colors, card shape, typography, spacing, and motion.
- [ ] Persist theme state in settings, workspace, and list style JSON fields.
- [ ] Ship starter themes and creator-style presets.
- [ ] Add optional effects: drop glow, row pulse, S-tier celebration, shake presets, and callouts.
- [ ] Respect reduced-motion preference.
- [ ] Add tests for token serialization and reduced-motion behavior.
- [ ] Run `pnpm test`; expected: pass.
- [ ] Commit with `git commit -m "Add theme studio and presentation effects"`.

## Task 11: Templates, Snapshots, AI Settings

**Files:**
- Create: `src/main/services/templates/templateService.ts`
- Create: `src/main/services/ai/aiProviderManager.ts`
- Create: `src/renderer/features/templates/*`
- Create: `src/renderer/features/snapshots/*`
- Modify: `src/renderer/routes/SettingsPage.tsx`

- [ ] Seed starter templates during migrations.
- [ ] Support create template from list and instantiate template into a workspace.
- [ ] Support snapshot create/list/restore for tier list state.
- [ ] Add AI provider settings UI and provider registry abstraction.
- [ ] Keep item generation unavailable until a provider is configured.
- [ ] Add tests for template instantiate, snapshot restore, and AI disabled/configured states.
- [ ] Run `pnpm test`; expected: pass.
- [ ] Commit with `git commit -m "Add templates snapshots and AI settings"`.

## Task 12: Export, Backup, Restore

**Files:**
- Create: `src/main/services/exports/exportImageService.ts`
- Create: `src/main/services/exports/exportPackageService.ts`
- Create: `src/main/services/exports/exportCsvService.ts`
- Create: `src/main/services/backups/backupService.ts`
- Create: `src/renderer/features/export/*`

- [ ] Export PNG/JPEG from the current on-screen board appearance.
- [ ] Export JSON package with list data and managed asset references.
- [ ] Export CSV summary with tier labels, item labels, subtitles, notes, tags, and positions.
- [ ] Implement backup creation for database plus managed assets.
- [ ] Implement restore flow with validation and restart/reload handling.
- [ ] Add tests for CSV content, package shape, image export existence, and backup/restore round trip.
- [ ] Run `pnpm test`; expected: pass.
- [ ] Commit with `git commit -m "Implement exports and backups"`.

## Task 13: Accessibility, Polish, And Error Handling

**Files:**
- Modify: `src/renderer/components/**`
- Modify: `src/renderer/features/**`
- Create: `tests/e2e/accessibility.spec.ts`

- [ ] Audit all icon-only buttons for accessible names.
- [ ] Ensure dialogs trap and restore focus.
- [ ] Add consistent toast/error surfaces for failed imports, failed exports, validation errors, and backup failures.
- [ ] Verify text does not overlap at desktop and narrow widths.
- [ ] Add keyboard-only Playwright flow covering create, add, move, edit, snapshot, and export.
- [ ] Run `pnpm test:e2e tests/e2e/accessibility.spec.ts`; expected: pass.
- [ ] Commit with `git commit -m "Polish accessibility and error states"`.

## Task 14: Packaging And Acceptance

**Files:**
- Modify: `electron-builder.yml`
- Modify: `package.json`
- Create: `tests/e2e/packaged-smoke.spec.ts`

- [ ] Configure app ID, product name, icons, artifact names, and unsigned NSIS settings for `Tier List Studio`.
- [ ] Build production assets with `pnpm build`.
- [ ] Build unsigned Windows installer with `pnpm package:win`.
- [ ] Install or smoke-run packaged output on Windows.
- [ ] Verify acceptance flow: create list, import/paste items, mouse and keyboard drag, customize rows/theme, autosave, reopen, duplicate, snapshot, search, export image/package/CSV, backup/restore.
- [ ] Run `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, and `pnpm package:win`; expected: all pass and installer artifact exists.
- [ ] Commit with `git commit -m "Package Tier List Studio for Windows"`.

## Final Acceptance Checklist

- [ ] Full PDF-defined v1 scope is implemented.
- [ ] No renderer direct access to Node, SQLite, filesystem, or raw `ipcRenderer`.
- [ ] All privileged actions pass through typed preload API and Zod-validated IPC.
- [ ] Media imports are copied into managed app assets.
- [ ] Undo/redo works for current editor session only.
- [ ] Exports match current screen appearance.
- [ ] Starter templates ship with the app.
- [ ] AI provider abstraction and settings UI exist; no default provider is required.
- [ ] Windows unsigned NSIS installer is produced.
- [ ] Cross-platform package targets remain configured for macOS/Linux validation after Windows acceptance.

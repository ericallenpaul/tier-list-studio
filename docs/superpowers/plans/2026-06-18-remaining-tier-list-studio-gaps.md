# Remaining Tier List Studio Gaps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the remaining v1 gaps so Tier List Studio behaves like a polished desktop creator tool with dashboard, media items, editable tier boards, settings, templates, and production-ready exports.

**Architecture:** Replace the current monolithic demo renderer with focused React pages, shared editor state, and IPC-backed persistence. Keep presentation mode as a clean export surface while build mode provides editing controls, settings, templates, and media management.

**Tech Stack:** Electron, React, TypeScript, Vite, better-sqlite3, Zod, Playwright, Vitest, html-to-image, dnd-kit.

---

## Current Baseline

Presentation mode now hides app controls and PNG export writes a real artifact. The remaining work is the actual creator workflow: dashboard, DB-backed editor state, Add Items modal, media support, row/item editing, templates, settings, and export variants.

## File Structure

- Create `src/renderer/domain/editorTypes.ts` for renderer board, row, item, template, and settings view models.
- Create `src/renderer/domain/editorMappers.ts` to convert API entities into renderer view models.
- Create `src/renderer/state/editorStore.ts` for load/save/move/edit actions backed by `window.tierStudio`.
- Create `src/renderer/pages/DashboardPage.tsx`, `src/renderer/pages/EditorPage.tsx`, and `src/renderer/pages/SettingsPage.tsx`.
- Create `src/renderer/components/AddItemsModal.tsx`, `TierBoard.tsx`, `ItemDock.tsx`, `RowEditor.tsx`, `BottomRail.tsx`, `PresentationSurface.tsx`, and `ExportPanel.tsx`.
- Split `src/renderer/styles.css` into component-scoped sections in the same file first; only create separate CSS files if the file becomes difficult to review.
- Extend `src/main/ipc/registerHandlers.ts` for asset import, templates, settings, snapshots, CSV/package export, and backups.
- Extend tests under `tests/e2e/` for critical user flows and `tests/unit/` for mappers/export helpers.

---

### Task 1: Dashboard and DB-Backed Editor Boot

**Files:**
- Create: `src/renderer/domain/editorTypes.ts`
- Create: `src/renderer/domain/editorMappers.ts`
- Create: `src/renderer/state/editorStore.ts`
- Create: `src/renderer/pages/DashboardPage.tsx`
- Modify: `src/renderer/App.tsx`
- Test: `tests/e2e/dashboard-editor-flow.spec.ts`

- [ ] **Step 1: Write the failing e2e test**

```ts
test("creates a board from the dashboard and reopens it after reload", async ({ page }) => {
  await page.getByRole("button", { name: "New Board" }).click();
  await page.getByLabel("Board title").fill("Snack Ranking");
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.getByRole("heading", { name: "Snack Ranking" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Snack Ranking" })).toBeVisible();
});
```

- [ ] **Step 2: Verify the test fails**

Run: `corepack pnpm exec playwright test tests/e2e/dashboard-editor-flow.spec.ts --grep "creates a board"`

Expected: FAIL because the dashboard and create-board flow do not exist.

- [ ] **Step 3: Implement the minimal dashboard and store**

Create a store API with these methods:

```ts
export type EditorStore = {
  loadDashboard: () => Promise<{ workspaces: Workspace[]; recentLists: TierList[] }>;
  createBoard: (name: string) => Promise<string>;
  openBoard: (listId: string) => Promise<void>;
};
```

Use `window.tierStudio.workspaces.create`, `lists.create`, `rows.insert`, and `lists.get`. Seed S/A/B/C/D rows on create.

- [ ] **Step 4: Verify**

Run: `corepack pnpm exec playwright test tests/e2e/dashboard-editor-flow.spec.ts --grep "creates a board"`

Expected: PASS.

---

### Task 2: Spec-Accurate Editor Layout

**Files:**
- Create: `src/renderer/pages/EditorPage.tsx`
- Create: `src/renderer/components/TierBoard.tsx`
- Create: `src/renderer/components/ItemDock.tsx`
- Create: `src/renderer/components/BottomRail.tsx`
- Create: `src/renderer/components/PresentationSurface.tsx`
- Modify: `src/renderer/App.tsx`
- Modify: `src/renderer/styles.css`
- Test: `tests/e2e/editor-layout.spec.ts`

- [ ] **Step 1: Write the failing layout test**

```ts
test("build mode has editor regions and presentation has no controls", async ({ page }) => {
  await createBoard(page, "Layout Test");
  await expect(page.getByTestId("top-command-bar")).toBeVisible();
  await expect(page.getByTestId("metadata-strip")).toBeVisible();
  await expect(page.getByTestId("tier-board")).toBeVisible();
  await expect(page.getByTestId("item-dock")).toBeVisible();
  await expect(page.getByTestId("bottom-rail")).toBeVisible();
  await page.getByRole("button", { name: "Presentation" }).click();
  await expect(page.getByTestId("top-command-bar")).toBeHidden();
  await expect(page.getByRole("button", { name: "Export" })).toBeHidden();
});
```

- [ ] **Step 2: Verify it fails**

Run: `corepack pnpm exec playwright test tests/e2e/editor-layout.spec.ts`

Expected: FAIL because editor regions are not split into spec components.

- [ ] **Step 3: Move current UI into focused components**

Use these test IDs exactly: `top-command-bar`, `metadata-strip`, `tier-board`, `item-dock`, `bottom-rail`, `presentation-surface`. Keep presentation rendering in `PresentationSurface` and keep app controls out of that component.

- [ ] **Step 4: Verify**

Run: `corepack pnpm exec playwright test tests/e2e/editor-layout.spec.ts`

Expected: PASS.

---

### Task 3: Add Items Modal with Text and Media

**Files:**
- Create: `src/renderer/components/AddItemsModal.tsx`
- Modify: `src/main/ipc/registerHandlers.ts`
- Modify: `src/main/services/repositories/assetRepository.ts`
- Modify: `src/main/services/lists/listService.ts`
- Test: `tests/e2e/add-items-flow.spec.ts`
- Test: `tests/integration/asset-import.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
test("adds text items from the Add Items modal", async ({ page }) => {
  await createBoard(page, "Text Items");
  await page.getByRole("button", { name: "Add Items" }).click();
  await page.getByRole("tab", { name: "Text" }).click();
  await page.getByLabel("Items").fill("Pizza\nPasta\nTacos");
  await page.getByRole("button", { name: "Add 3 Items" }).click();
  await expect(page.getByTestId("item-dock")).toContainText("Pizza");
  await expect(page.getByTestId("item-dock")).toContainText("Tacos");
});
```

- [ ] **Step 2: Verify failure**

Run: `corepack pnpm exec playwright test tests/e2e/add-items-flow.spec.ts`

Expected: FAIL because the modal does not exist.

- [ ] **Step 3: Implement text mode first**

Wire `AddItemsModal` to `window.tierStudio.items.addTextBatch(listId, lines)` and refresh editor state after success.

- [ ] **Step 4: Implement image/video import**

Use `window.tierStudio.dialogs.openFiles({ multiple: true, filters: [...] })`, copy files into `app.getPath("userData")/assets`, create asset records, and create items with `kind: "image"` or `kind: "video"`.

- [ ] **Step 5: Verify**

Run: `corepack pnpm test && corepack pnpm exec playwright test tests/e2e/add-items-flow.spec.ts`

Expected: PASS.

---

### Task 4: Real Drag, Row Editing, and Keyboard Movement

**Files:**
- Modify: `package.json`
- Modify: `src/renderer/components/TierBoard.tsx`
- Create: `src/renderer/components/RowEditor.tsx`
- Modify: `src/renderer/state/editorStore.ts`
- Test: `tests/e2e/board-editing.spec.ts`

- [ ] **Step 1: Add dnd-kit**

Run: `corepack pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`

- [ ] **Step 2: Write failing tests**

```ts
test("renames, recolors, reorders, and deletes tier rows", async ({ page }) => {
  await createBoard(page, "Rows");
  await page.getByRole("button", { name: "Edit row S" }).click();
  await page.getByLabel("Row label").fill("Top");
  await page.getByLabel("Row color").fill("#ff00aa");
  await page.getByRole("button", { name: "Save row" }).click();
  await expect(page.getByText("Top")).toBeVisible();
});
```

- [ ] **Step 3: Verify failure**

Run: `corepack pnpm exec playwright test tests/e2e/board-editing.spec.ts`

Expected: FAIL because row editing is not implemented.

- [ ] **Step 4: Implement row actions through IPC**

Use `rows.update`, `rows.insert`, `rows.reorder`, `rows.remove`, and `positions.move`. Keep row controls hidden in presentation mode.

- [ ] **Step 5: Verify**

Run: `corepack pnpm test && corepack pnpm exec playwright test tests/e2e/board-editing.spec.ts`

Expected: PASS.

---

### Task 5: Item Dock, Inspector, and Bulk Actions

**Files:**
- Modify: `src/renderer/components/ItemDock.tsx`
- Create: `src/renderer/components/ItemInspector.tsx`
- Modify: `src/renderer/state/editorStore.ts`
- Test: `tests/e2e/item-dock-flow.spec.ts`

- [ ] **Step 1: Write failing test**

```ts
test("filters, edits, and sends selected items back to pool", async ({ page }) => {
  await createBoardWithItems(page, "Dock", ["Pizza", "Pasta", "Tacos"]);
  await page.getByPlaceholder("Filter items").fill("Piz");
  await expect(page.getByText("Pizza")).toBeVisible();
  await expect(page.getByText("Pasta")).toBeHidden();
  await page.getByText("Pizza").click();
  await page.getByLabel("Item label").fill("Neapolitan Pizza");
  await page.getByRole("button", { name: "Save item" }).click();
  await expect(page.getByText("Neapolitan Pizza")).toBeVisible();
});
```

- [ ] **Step 2: Implement dock behavior**

Support search, sort by label/date/kind, multi-select checkboxes, send to pool, delete, duplicate, and metadata editing through `items.update`, `items.remove`, and `positions.move`.

- [ ] **Step 3: Verify**

Run: `corepack pnpm exec playwright test tests/e2e/item-dock-flow.spec.ts`

Expected: PASS.

---

### Task 6: Templates, Themes, Settings, and Provider Abstraction UI

**Files:**
- Create: `src/renderer/pages/SettingsPage.tsx`
- Create: `src/renderer/components/TemplatePicker.tsx`
- Modify: `src/main/ipc/registerHandlers.ts`
- Modify: `src/main/services/repositories/templateRepository.ts`
- Modify: `src/main/services/repositories/settingsRepository.ts`
- Test: `tests/e2e/settings-template-flow.spec.ts`

- [ ] **Step 1: Write failing test**

```ts
test("saves provider settings outside the board and creates a reusable template", async ({ page }) => {
  await createBoard(page, "Template Source");
  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByLabel("OpenAI API key").fill("test-key");
  await page.getByRole("button", { name: "Save Settings" }).click();
  await expect(page.getByTestId("tier-board")).toBeHidden();
  await page.getByRole("button", { name: "Board" }).click();
  await page.getByRole("button", { name: "Save as Template" }).click();
  await page.getByLabel("Template name").fill("Starter Creator Board");
  await page.getByRole("button", { name: "Save Template" }).click();
  await expect(page.getByText("Starter Creator Board")).toBeVisible();
});
```

- [ ] **Step 2: Implement settings and templates**

Store settings via `settings.update`; never render provider controls on board or presentation screens. Implement `templates.list`, `templates.createFromList`, and `templates.instantiate`.

- [ ] **Step 3: Verify**

Run: `corepack pnpm test && corepack pnpm exec playwright test tests/e2e/settings-template-flow.spec.ts`

Expected: PASS.

---

### Task 7: Search and AI Item Generation

**Files:**
- Modify: `src/renderer/components/AddItemsModal.tsx`
- Create: `src/main/services/ai/providerRegistry.ts`
- Create: `src/main/services/ai/localProvider.ts`
- Modify: `src/main/ipc/registerHandlers.ts`
- Modify: `src/shared/schemas/inputs.ts`
- Test: `tests/e2e/search-ai-items-flow.spec.ts`
- Test: `tests/unit/aiProviderRegistry.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
test("searches existing items and generates local AI suggestions", async ({ page }) => {
  await createBoardWithItems(page, "AI", ["Pizza", "Pasta"]);
  await page.getByRole("button", { name: "Add Items" }).click();
  await page.getByRole("tab", { name: "Search" }).click();
  await page.getByPlaceholder("Search library").fill("Piz");
  await expect(page.getByText("Pizza")).toBeVisible();
  await page.getByRole("tab", { name: "AI" }).click();
  await page.getByLabel("Prompt").fill("Generate five breakfast foods");
  await page.getByRole("button", { name: "Generate" }).click();
  await expect(page.getByTestId("generated-items")).toContainText("Pancakes");
});
```

- [ ] **Step 2: Implement provider registry**

Create this interface:

```ts
export type AiItemProvider = {
  id: string;
  label: string;
  configured: boolean;
  generateItems: (input: AiGenerateItemsInput) => Promise<GeneratedItemsResult>;
};
```

Add a deterministic local provider for tests that returns `Pancakes`, `Waffles`, `Omelet`, `Bagel`, and `Yogurt` for breakfast prompts. Keep external providers disabled until API keys are configured in Settings.

- [ ] **Step 3: Wire Add Items Search and AI tabs**

Use `items.search` for Search and `ai.generateItems` for AI. Generated items must be reviewable before adding to the board.

- [ ] **Step 4: Verify**

Run: `corepack pnpm test && corepack pnpm exec playwright test tests/e2e/search-ai-items-flow.spec.ts`

Expected: PASS.

---

### Task 8: Export Variants, Packages, CSV, and Backups

**Files:**
- Create: `src/renderer/components/ExportPanel.tsx`
- Create: `src/main/services/export/exportCsvService.ts`
- Create: `src/main/services/export/exportPackageService.ts`
- Modify: `src/main/ipc/registerHandlers.ts`
- Test: `tests/e2e/export-flow.spec.ts`
- Test: `tests/integration/export-services.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
test("exports png, jpeg, csv, and package artifacts", async ({ page }) => {
  await createBoardWithItems(page, "Exports", ["Pizza", "Pasta"]);
  await page.getByRole("button", { name: "Export" }).click();
  await page.getByRole("button", { name: "PNG" }).click();
  await expect(page.getByText(/.png/)).toBeVisible();
  await page.getByRole("button", { name: "CSV" }).click();
  await expect(page.getByText(/.csv/)).toBeVisible();
  await page.getByRole("button", { name: "Package" }).click();
  await expect(page.getByText(/.json/)).toBeVisible();
});
```

- [ ] **Step 2: Implement export panel**

Keep export controls in build mode only. All exports must capture or serialize the same clean presentation state.

- [ ] **Step 3: Verify**

Run: `corepack pnpm test && corepack pnpm exec playwright test tests/e2e/export-flow.spec.ts`

Expected: PASS.

---

### Task 9: Visual Polish, Starter Templates, and Installer Release Check

**Files:**
- Create: `src/renderer/templates/starterTemplates.ts`
- Modify: `electron-builder.yml`
- Modify: `.github/workflows/release.yml`
- Test: `tests/e2e/presentation-polish.spec.ts`

- [ ] **Step 1: Write failing presentation visual test**

```ts
test("starter templates render video-ready presentation boards", async ({ page }) => {
  await page.getByRole("button", { name: "Use Template" }).click();
  await page.getByText("Midnight Neon").click();
  await page.getByRole("button", { name: "Presentation" }).click();
  await expect(page.locator(".presentation .topbar")).toBeHidden();
  await expect(page.getByTestId("presentation-surface")).toHaveScreenshot("midnight-neon-presentation.png");
});
```

- [ ] **Step 2: Implement starter templates**

Ship at least `Midnight Neon`, `Tournament Board`, and `Clean Studio`. Each template defines rows, colors, item sizing, background, label width, and presentation effects.

- [ ] **Step 3: Verify installers**

Run these commands on Windows:

```bash
corepack pnpm package:win
corepack pnpm run build
```

Expected: Windows NSIS installer exists in `release/`. GitHub Actions should build Windows, macOS, and Linux artifacts from the release workflow.

---

## Execution Order

1. Dashboard and DB-backed editor boot.
2. Editor layout split.
3. Add Items modal with text and media.
4. Drag, row editing, and keyboard movement.
5. Item dock and inspector.
6. Templates, settings, and provider abstraction.
7. Search and AI item generation.
8. Export variants and backups.
9. Visual polish and installer release check.

## Spec Coverage Review

- Dashboard entry points: Task 1.
- Editor five-region layout: Task 2.
- Add Items modes: Task 3 covers Text, Images, Video; Task 7 covers Search and AI.
- Drag/drop and row management: Task 4.
- Right dock, filter, bulk actions: Task 5.
- Settings and provider abstraction: Task 6.
- Presentation polish and clean export surface: Task 8, building on current baseline.
- PNG/JPEG/JSON package/CSV/backups: Task 8.
- Cross-platform installer release: Task 9.

# Repository Guidelines

## Project Structure & Module Organization

This repository now contains the initial Electron + Vite + React + TypeScript scaffold for Tier List Studio. Product requirements remain in the design spec under `docs/superpowers/specs/`, with implementation sequencing in `docs/superpowers/plans/`.

Keep the layout conventional:

- `src/` for application code.
- `tests/` for automated tests.
- `assets/` for images, icons, sample data, and static resources.
- `docs/` for supporting design notes, specs, and implementation plans.

Do not commit generated files, build output, or local tool caches.

## Build, Test, and Development Commands

Use pnpm through Corepack if a local pnpm shim is unavailable.

- `pnpm run dev`: start the Vite dev server and Electron app.
- `pnpm run build`: typecheck and build renderer, main, and preload output.
- `pnpm run build:electron`: compile Electron main and preload output only.
- `pnpm test`: run the Vitest suite.
- `pnpm run test:e2e`: run Playwright e2e tests.
- `pnpm run lint`: run lightweight static validation.
- `pnpm run typecheck`: run TypeScript without emitting files.
- `pnpm run package:win`: build and package an unsigned Windows NSIS installer.
- `pnpm run package:mac`: build and package a local macOS DMG on macOS.
- `pnpm run package:mac:x64`: build a local macOS x64 DMG on macOS.
- `pnpm run package:mac:arm64`: build a local macOS arm64 DMG on macOS.
- `pnpm run package:linux`: build and package a local Linux AppImage on Linux.

Do not add undocumented scripts. List contributor-facing scripts here or in the README.

## Coding Style & Naming Conventions

Follow the conventions of the selected framework and language. Prefer readable names over abbreviations.

Recommended defaults until tooling is established:

- Use 2-space indentation for JavaScript, TypeScript, JSON, CSS, and Markdown.
- Use `PascalCase` for UI components and classes.
- Use `camelCase` for variables, functions, and methods.
- Use `kebab-case` for file and directory names unless a framework requires otherwise.

Add a formatter and linter early, then run them before opening a pull request.

## Testing Guidelines

Vitest and Playwright are configured. When code is added, include tests with the related feature or bug fix.

Use behavior-focused test names, for example `creates-tier-from-dropped-image` or `exports-list-as-png`. Co-locate tests when the framework favors it, or place integration tests under `tests/`.

## Commit & Pull Request Guidelines

There is no existing commit history, so no repository-specific convention is established. Use concise, imperative commit messages such as `Add tier drag ordering` or `Document export workflow`.

Pull requests should include:

- A short summary of the change.
- Any linked issue or requirement from the specification.
- Test results or a note explaining why tests were not run.
- Screenshots or recordings for UI changes.

## Contributors

- Codex: https://github.com/codex

## Agent-Specific Instructions

Before editing implementation files, inspect the current tree and preserve user changes. Keep updates scoped, and update this guide whenever structure or workflows change.

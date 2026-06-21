# Tier List Studio

Local-first desktop app for creating polished tier-list boards, presentation-ready layouts, and exportable ranking assets.

## Installers

Download installers from the GitHub Releases page:

- [Tier List Studio Releases](https://github.com/ericallenpaul/tier-list-studio/releases)
- [Windows x64 installer](https://github.com/ericallenpaul/tier-list-studio/releases/download/v0.1.0/Tier%20List%20Studio-0.1.0-win-x64.exe)
- [Linux x64 AppImage](https://github.com/ericallenpaul/tier-list-studio/releases/download/v0.1.0/Tier%20List%20Studio-0.1.0-linux-x86_64.AppImage)
- macOS DMG: build on macOS with `corepack pnpm run package:mac`, then attach it manually to the release.

Release uploads are manual. This repository intentionally does not use CI/CD or automated publishing.

## Local Development

```powershell
corepack pnpm install
corepack pnpm run dev
```

## Verification

```powershell
corepack pnpm run typecheck
corepack pnpm test
corepack pnpm test:e2e
```

## Local Packaging

```powershell
corepack pnpm run package:win
corepack pnpm run package:mac
corepack pnpm run package:linux
```

Generated artifacts are written to `release/`.

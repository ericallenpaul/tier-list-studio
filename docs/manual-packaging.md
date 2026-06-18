# Manual Packaging Notes

Tier List Studio currently supports local PNG, JPEG, CSV, and JSON package exports. The package export is a pragmatic rehydration artifact: it includes board data, row/item positions, referenced media asset records, and managed asset file data when the managed files are readable at export time. If a managed asset cannot be embedded, the package records the managed relative path, resolved local path when available, source path, and existence flags so a future importer can report or recover the missing artifact explicitly.

Backup and restore are intentionally deferred for this release slice. The preload contract contains backup methods for the planned API surface, but the main-process handlers are not presented in the renderer UI and still fail fast. A backup implementation should be added only when it can capture both the SQLite database and managed assets under a consistent strategy that avoids copying a live database in an unsafe state.

Do not add release automation, publishing workflows, or installer CI for this task. Windows packaging remains a manual local command:

```powershell
corepack pnpm run package:win
```

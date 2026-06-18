import { spawnSync } from "node:child_process";
import { rmSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const betterSqliteBuild = resolve(dirname(require.resolve("better-sqlite3/package.json")), "build");

const command = "corepack";

const run = (args, options = {}) => {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    stdio: "inherit",
    shell: process.platform === "win32"
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0 && !options.allowFailure) {
    throw new Error(`${command} ${args.join(" ")} failed with exit code ${result.status ?? 1}`);
  }

  return result.status ?? 0;
};

const rebuildForCurrentRuntime = () => {
  rmSync(betterSqliteBuild, { recursive: true, force: true, maxRetries: 5, retryDelay: 250 });
  run(["pnpm", "rebuild", "better-sqlite3"]);
};

let exitCode = 0;

try {
  run(["pnpm", "run", "build"]);
  rmSync(betterSqliteBuild, { recursive: true, force: true, maxRetries: 5, retryDelay: 250 });
  run(["pnpm", "exec", "electron-builder", "install-app-deps"]);
  exitCode = run(["pnpm", "exec", "playwright", "test", "--workers=1", "--pass-with-no-tests"], { allowFailure: true });
} catch (error) {
  exitCode = 1;
  console.error(error instanceof Error ? error.message : error);
} finally {
  try {
    rebuildForCurrentRuntime();
  } catch (error) {
    exitCode = exitCode || 1;
    console.error(error instanceof Error ? error.message : error);
  }
}

process.exit(exitCode);

import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { copyDatabaseSchema } from "../../../scripts/copy-db-schema.mjs";

let tempDir = "";

afterEach(() => {
  if (tempDir) {
    rmSync(tempDir, { recursive: true, force: true });
    tempDir = "";
  }
});

describe("database schema build asset", () => {
  it("copies schema.sql to the compiled main-process output path", () => {
    tempDir = mkdtempSync(join(tmpdir(), "tier-list-studio-schema-copy-"));
    const sourcePath = join(tempDir, "src", "main", "services", "db", "schema.sql");
    const targetPath = join(tempDir, "dist", "main", "services", "db", "schema.sql");
    mkdirSync(join(tempDir, "src", "main", "services", "db"), { recursive: true });
    writeFileSync(sourcePath, "CREATE TABLE copied_schema_check (id TEXT PRIMARY KEY) STRICT;");

    copyDatabaseSchema({ sourcePath, targetPath });

    expect(existsSync(targetPath)).toBe(true);
    expect(readFileSync(targetPath, "utf8")).toContain("copied_schema_check");
  });
});

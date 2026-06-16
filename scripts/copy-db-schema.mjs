import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const copyDatabaseSchema = ({
  sourcePath = join("src", "main", "services", "db", "schema.sql"),
  targetPath = join("dist", "main", "services", "db", "schema.sql")
} = {}) => {
  mkdirSync(dirname(targetPath), { recursive: true });
  copyFileSync(sourcePath, targetPath);
};

if (resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1])) {
  copyDatabaseSchema();
}

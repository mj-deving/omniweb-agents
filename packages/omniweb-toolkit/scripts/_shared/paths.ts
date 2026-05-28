import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const THIS_DIR = dirname(dirname(fileURLToPath(import.meta.url)));

export const PACKAGE_ROOT = resolve(THIS_DIR, "..");
export const REPO_ROOT = resolve(PACKAGE_ROOT, "..", "..");
export const DEFAULT_SNAPSHOT_DIR = resolve(
  REPO_ROOT,
  "docs",
  "research",
  "supercolony-discovery",
);

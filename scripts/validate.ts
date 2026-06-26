/**
 * validate.ts
 *
 * Validates extensions.yaml against the schema and runs extra checks:
 *   - YAML parseable
 *   - Every entry has a valid `repo` in github.com/owner/name format
 *   - No duplicate repos
 *   - (Optional) check repos exist on GitHub
 *
 * Usage: npx tsx scripts/validate.ts [--check-online]
 */

import { parse as parseYaml } from "yaml";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { execSync } from "node:child_process";

// ── Types ────────────────────────────────────────────────────────

interface ExtensionEntry {
  repo?: string;
  branch?: string;
  description?: string;
  tags?: unknown;
  name?: string;
  version?: string;
  updated_at?: string;
  stars?: unknown;
  deprecated?: unknown;
  extensions_count?: unknown;
  skills_count?: unknown;
  prompts_count?: unknown;
  themes_count?: unknown;
  tools?: unknown;
  commands?: unknown;
  shortcuts?: unknown;
  pi_manifest?: unknown;
}

interface ExtensionsFile {
  extensions?: ExtensionEntry[];
}

// ── Constants ────────────────────────────────────────────────────

const EXTENSIONS_YAML = resolve(process.cwd(), "extensions.yaml");
const REPO_PATTERN = /^github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/;

const NON_NEGATIVE_INT_FIELDS = [
  "stars",
  "extensions_count",
  "skills_count",
  "prompts_count",
  "themes_count",
  "tools",
  "commands",
  "shortcuts",
] as const;

// ── Helpers ──────────────────────────────────────────────────────

function sh(cmd: string): string {
  try {
    return execSync(cmd, {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch {
    return "";
  }
}

function ghRepoExists(repo: string): boolean {
  const path = repo.replace(/^github\.com\//, "");
  const out = sh(`gh api repos/${path} --jq .full_name 2>/dev/null`);
  if (out) return true;
  const curl = sh(
    `curl -sf -o /dev/null -w '%{http_code}' https://api.github.com/repos/${path} 2>/dev/null`
  );
  return curl === "200";
}

// ── Validation ───────────────────────────────────────────────────

interface ValidationError {
  index: number;
  repo: string;
  field: string;
  message: string;
}

async function validate(): Promise<ValidationError[]> {
  const errors: ValidationError[] = [];

  // 1. Parse YAML
  let data: ExtensionsFile;
  try {
    const raw = await readFile(EXTENSIONS_YAML, "utf-8");
    data = parseYaml(raw) as ExtensionsFile;
  } catch (err) {
    return [
      {
        index: -1,
        repo: "-",
        field: "file",
        message: `Failed to parse extensions.yaml: ${err}`,
      },
    ];
  }

  if (!Array.isArray(data.extensions)) {
    // Empty array is ok — just means no entries yet
    return [];
  }

  const seenRepos = new Map<string, number>();

  for (let i = 0; i < data.extensions.length; i++) {
    const ext = data.extensions[i];
    const repo = ext.repo ?? "(missing)";

    // Required: repo
    if (!ext.repo || typeof ext.repo !== "string") {
      errors.push({
        index: i,
        repo,
        field: "repo",
        message: "Missing or invalid (required)",
      });
    } else if (!REPO_PATTERN.test(ext.repo)) {
      errors.push({
        index: i,
        repo,
        field: "repo",
        message: `Invalid format. Expected github.com/owner/name, got "${ext.repo}"`,
      });
    }

    // Duplicate check
    if (ext.repo && typeof ext.repo === "string") {
      const normalized = ext.repo.toLowerCase();
      if (seenRepos.has(normalized)) {
        errors.push({
          index: i,
          repo,
          field: "repo",
          message: `Duplicate (also at index ${seenRepos.get(normalized)})`,
        });
      } else {
        seenRepos.set(normalized, i);
      }
    }

    // tags array check
    if (ext.tags !== undefined) {
      if (!Array.isArray(ext.tags)) {
        errors.push({
          index: i,
          repo,
          field: "tags",
          message: "Must be an array of strings",
        });
      } else if (ext.tags.some((t) => typeof t !== "string")) {
        errors.push({
          index: i,
          repo,
          field: "tags",
          message: "All tags must be strings",
        });
      }
    }

    // Non-negative integer fields
    for (const field of NON_NEGATIVE_INT_FIELDS) {
      const val = ext[field];
      if (val !== undefined) {
        if (typeof val !== "number" || !Number.isInteger(val) || val < 0) {
          errors.push({
            index: i,
            repo,
            field,
            message: `Must be a non-negative integer, got ${typeof val}`,
          });
        }
      }
    }

    // boolean fields
    if (
      ext.deprecated !== undefined &&
      typeof ext.deprecated !== "boolean"
    ) {
      errors.push({
        index: i,
        repo,
        field: "deprecated",
        message: "Must be a boolean",
      });
    }

    // pi_manifest must be object or null if present
    if (
      ext.pi_manifest !== undefined &&
      ext.pi_manifest !== null &&
      typeof ext.pi_manifest !== "object"
    ) {
      errors.push({
        index: i,
        repo,
        field: "pi_manifest",
        message: "Must be an object or null",
      });
    }
  }

  return errors;
}

// ── Main ─────────────────────────────────────────────────────────

async function main() {
  const checkOnline = process.argv.includes("--check-online");

  console.log("🔍 Validating extensions.yaml...\n");

  const errors = await validate();

  // Online check
  if (checkOnline && errors.length === 0) {
    const raw = await readFile(EXTENSIONS_YAML, "utf-8");
    const data = parseYaml(raw) as ExtensionsFile;
    const exts = data.extensions ?? [];

    console.log(`🌐 Checking ${exts.length} repos on GitHub...\n`);

    for (const ext of exts) {
      if (!ext.repo) continue;
      const exists = ghRepoExists(ext.repo);
      if (!exists) {
        errors.push({
          index: exts.indexOf(ext),
          repo: ext.repo,
          field: "repo",
          message: "Repository does not exist or is not public",
        });
      } else {
        console.log(`  ✅ ${ext.repo}`);
      }
    }
  }

  if (errors.length === 0) {
    console.log("✅ All checks passed!");
    process.exit(0);
  }

  console.error(`\n❌ ${errors.length} validation error(s):\n`);
  for (const err of errors) {
    console.error(`  [${err.index}] ${err.repo}`);
    console.error(`      ${err.field}: ${err.message}\n`);
  }
  process.exit(1);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});

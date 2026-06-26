/**
 * update-metadata.ts
 *
 * Clones (or fetches) each extension repo listed in extensions.yaml,
 * parses package.json as the canonical entry point, then extracts
 * metadata strictly following the pi package specification:
 *
 *   package.json
 *   └── pi                         <-- pi manifest (the source of truth)
 *       ├── extensions[]           --> count .ts/.js files, scan for register* calls
 *       ├── skills[]               --> count SKILL.md
 *       ├── prompts[]              --> count .md
 *       ├── themes[]               --> count .json
 *       ├── video / image          --> gallery preview
 *
 * Falls back to conventional directories (extensions/, skills/, etc.)
 * only when the `pi` key is absent.
 *
 * Usage: npx tsx scripts/update-metadata.ts [--cache-dir /tmp/pi-exts]
 */

import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { globSync } from "node:fs";
import { statSync } from "node:fs";

// ── Types (mirrors pi package.json pi key) ───────────────────────

interface PiManifest {
  /** Glob paths to extension entry files (.ts/.js) */
  extensions?: string[];
  /** Glob paths to skill directories (containing SKILL.md) */
  skills?: string[];
  /** Glob paths to prompt template files (.md) */
  prompts?: string[];
  /** Glob paths to theme files (.json) */
  themes?: string[];
  /** Gallery preview video (mp4 URL) */
  video?: string;
  /** Gallery preview image (png/jpg/gif/webp URL) */
  image?: string;
}

interface PackageJson {
  name?: string;
  version?: string;
  description?: string;
  keywords?: string[];
  deprecated?: string | boolean;
  pi?: PiManifest;
  dependencies?: Record<string, string>;
  bundledDependencies?: string[];
}

interface ExtensionEntry {
  repo: string;
  branch?: string;
  description?: string;
  tags?: string[];

  // auto from package.json
  name?: string;
  version?: string;
  updated_at?: string;
  stars?: number;
  deprecated?: boolean;

  // resource counts (from pi manifest)
  extensions_count?: number;
  skills_count?: number;
  prompts_count?: number;
  themes_count?: number;

  // code metrics (from scanning .ts extension files)
  tools?: number;
  commands?: number;
  shortcuts?: number;

  // raw pi manifest snapshot
  pi_manifest?: PiManifest | null;
}

interface ExtensionsFile {
  extensions: ExtensionEntry[];
}

// ── Config ───────────────────────────────────────────────────────

const EXTENSIONS_YAML = resolve(process.cwd(), "extensions.yaml");
const CACHE_DIR =
  process.argv.includes("--cache-dir")
    ? process.argv[process.argv.indexOf("--cache-dir") + 1]
    : join(tmpdir(), "pi-extensions-cache");

// ── Shell helpers ────────────────────────────────────────────────

function sh(cmd: string, opts?: { cwd?: string }): string {
  try {
    return execSync(cmd, {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
      ...opts,
    }).trim();
  } catch {
    return "";
  }
}

function ghApi(path: string): string {
  return (
    sh(`gh api ${path} --jq . 2>/dev/null`) ||
    sh(`curl -sf https://api.github.com/${path} 2>/dev/null`)
  );
}

function repoPath(repo: string): string {
  return repo.replace(/^github\.com\//, "");
}

function cacheRepoPath(repo: string): string {
  const [owner, name] = repoPath(repo).split("/");
  return join(CACHE_DIR, `${owner}_${name}`);
}

// ── Git ──────────────────────────────────────────────────────────

function cloneOrPull(repo: string, branch: string, dest: string): boolean {
  const url = `https://${repo}.git`;
  if (existsSync(join(dest, ".git"))) {
    sh(`git fetch origin ${branch} --depth 1`, { cwd: dest });
    sh(`git checkout -f origin/${branch}`, { cwd: dest });
    return true;
  }
  sh(`git clone --depth 1 --single-branch --branch "${branch}" "${url}" "${dest}" 2>&1`);
  if (!existsSync(join(dest, ".git"))) {
    sh(`rm -rf "${dest}"`);
    sh(`git clone --depth 1 "${url}" "${dest}" 2>&1`);
  }
  return existsSync(join(dest, ".git"));
}

// ── package.json parsing (THE canonical entry point) ─────────────

function readPackageJson(repoDir: string): PackageJson | null {
  const pkgPath = join(repoDir, "package.json");
  if (!existsSync(pkgPath)) return null;
  try {
    return JSON.parse(readFileSync(pkgPath, "utf-8")) as PackageJson;
  } catch {
    return null;
  }
}

// ── Resolve pi manifest paths → file list ────────────────────────

/**
 * Resolve a pi manifest path (may contain globs) relative to repoRoot.
 * Returns absolute paths to matching files.
 */
function resolvePiPaths(
  repoRoot: string,
  patterns: string[] | undefined
): string[] {
  if (!patterns || patterns.length === 0) return [];

  const results: string[] = [];
  for (const pat of patterns) {
    const fullPat = join(repoRoot, pat);
    try {
      // Use shell find for simplicity (handles globs reliably)
      const found = sh(
        `find ${JSON.stringify(repoRoot)} -path ${JSON.stringify(fullPat)} ` +
          `-not -path '*/node_modules/*' -not -path '*/.git/*' 2>/dev/null`
      )
        .split("\n")
        .filter(Boolean);
      results.push(...found);
    } catch {
      // pattern didn't match
    }
  }
  return results;
}

/**
 * Resolve conventional directories when pi manifest is absent.
 * Mirrors pi's auto-discovery: extensions/, skills/, prompts/, themes/
 */
function resolveConventionalPaths(repoRoot: string): {
  extensionFiles: string[];
  skillFiles: string[];
  promptFiles: string[];
  themeFiles: string[];
} {
  return {
    extensionFiles: resolvePiPaths(repoRoot, [
      "extensions/*.ts",
      "extensions/*.js",
      "extensions/*/index.ts",
      "extensions/*/index.js",
    ]),
    skillFiles: resolvePiPaths(repoRoot, [
      "skills/**/SKILL.md",
      "skills/*.md",
    ]),
    promptFiles: resolvePiPaths(repoRoot, ["prompts/*.md"]),
    themeFiles: resolvePiPaths(repoRoot, ["themes/*.json"]),
  };
}

// ── Count by file extension ──────────────────────────────────────

function countExtensionFiles(repoRoot: string, pi: PiManifest | null): number {
  if (pi?.extensions) {
    const files = resolvePiPaths(repoRoot, pi.extensions);
    return files.filter(
      (f) => f.endsWith(".ts") || f.endsWith(".js")
    ).length;
  }
  // Fallback: conventional
  return resolveConventionalPaths(repoRoot).extensionFiles.length;
}

function countSkills(repoRoot: string, pi: PiManifest | null): number {
  if (pi?.skills) {
    const files = resolvePiPaths(repoRoot, pi.skills);
    return files.filter((f) => f.endsWith("SKILL.md")).length;
  }
  return resolveConventionalPaths(repoRoot).skillFiles.length;
}

function countPrompts(repoRoot: string, pi: PiManifest | null): number {
  if (pi?.prompts) {
    const files = resolvePiPaths(repoRoot, pi.prompts);
    return files.filter((f) => f.endsWith(".md")).length;
  }
  return resolveConventionalPaths(repoRoot).promptFiles.length;
}

function countThemes(repoRoot: string, pi: PiManifest | null): number {
  if (pi?.themes) {
    const files = resolvePiPaths(repoRoot, pi.themes);
    return files.filter((f) => f.endsWith(".json")).length;
  }
  return resolveConventionalPaths(repoRoot).themeFiles.length;
}

// ── Source-code metrics (scan extension .ts files) ───────────────

/**
 * Get the list of extension source files to scan, derived from the
 * pi manifest (or conventional dirs).
 */
function getExtensionSourceFiles(
  repoRoot: string,
  pi: PiManifest | null
): string[] {
  if (pi?.extensions) {
    return resolvePiPaths(repoRoot, pi.extensions).filter(
      (f) => f.endsWith(".ts") || f.endsWith(".js")
    );
  }
  return resolveConventionalPaths(repoRoot).extensionFiles;
}

function countPatternInFiles(files: string[], pattern: RegExp): number {
  let count = 0;
  for (const file of files) {
    try {
      const content = readFileSync(file, "utf-8");
      const matches = content.match(pattern);
      if (matches) count += matches.length;
    } catch {
      // skip unreadable
    }
  }
  return count;
}

function countCodeMetrics(
  repoRoot: string,
  pi: PiManifest | null
): { tools: number; commands: number; shortcuts: number } {
  const files = getExtensionSourceFiles(repoRoot, pi);
  return {
    tools: countPatternInFiles(files, /pi\.registerTool\s*\(/g),
    commands: countPatternInFiles(files, /pi\.registerCommand\s*\(/g),
    shortcuts: countPatternInFiles(files, /pi\.registerShortcut\s*\(/g),
  };
}

// ── GitHub metadata ──────────────────────────────────────────────

function getRepoStars(repo: string): number {
  const json = ghApi(`repos/${repoPath(repo)}`);
  if (!json) return 0;
  try {
    return JSON.parse(json).stargazers_count ?? 0;
  } catch {
    return 0;
  }
}

function getLastCommitDate(dir: string): string {
  return sh("git log -1 --format=%cI", { cwd: dir }) || "";
}

function getLatestVersion(dir: string, pkg: PackageJson | null): string {
  // git tag takes priority
  const tag = sh("git describe --tags --abbrev=0 2>/dev/null", { cwd: dir });
  if (tag) return tag.replace(/^v/, "");
  return pkg?.version ?? "0.0.0";
}

// ── Main ─────────────────────────────────────────────────────────

async function main() {
  console.log("📖 Reading extensions.yaml...");
  const raw = await readFile(EXTENSIONS_YAML, "utf-8");
  const data = parseYaml(raw) as ExtensionsFile;

  if (!data.extensions || !Array.isArray(data.extensions)) {
    console.error("❌ Invalid extensions.yaml: missing 'extensions' array");
    process.exit(1);
  }

  await mkdir(CACHE_DIR, { recursive: true });
  const updated: ExtensionEntry[] = [];

  for (const ext of data.extensions) {
    const { repo, branch = "main" } = ext;
    const dest = cacheRepoPath(repo);

    console.log(`\n🔍 ${repo}`);

    if (!cloneOrPull(repo, branch, dest)) {
      console.warn(`  ⚠️  Could not clone, skipping`);
      updated.push(ext);
      continue;
    }

    // ── 1. Parse package.json (the canonical entry point) ──
    const pkg = readPackageJson(dest);
    if (!pkg) {
      console.warn(`  ⚠️  No package.json at repo root, skipping`);
      updated.push(ext);
      continue;
    }

    const pi = pkg.pi ?? null;

    // ── 2. Extract metadata from package.json ──
    const name = pkg.name || repo.split("/").pop()!;
    const version = getLatestVersion(dest, pkg);
    const updated_at = getLastCommitDate(dest);
    const stars = getRepoStars(repo);
    const deprecated =
      pkg.deprecated !== undefined && pkg.deprecated !== false;

    // ── 3. Count resources from pi manifest ──
    const extCount = countExtensionFiles(dest, pi);
    const skillsCount = countSkills(dest, pi);
    const promptsCount = countPrompts(dest, pi);
    const themesCount = countThemes(dest, pi);

    // ── 4. Code-level metrics (scan .ts extension files) ──
    const codeMetrics = countCodeMetrics(dest, pi);

    const enriched: ExtensionEntry = {
      // preserve user-edited fields
      repo: ext.repo,
      branch: ext.branch,
      description: ext.description || pkg.description || "",
      tags: ext.tags,

      // auto from package.json
      name,
      version,
      updated_at,
      stars,
      deprecated,

      // resource counts
      extensions_count: extCount,
      skills_count: skillsCount,
      prompts_count: promptsCount,
      themes_count: themesCount,

      // code metrics
      tools: codeMetrics.tools,
      commands: codeMetrics.commands,
      shortcuts: codeMetrics.shortcuts,

      // raw snapshot
      pi_manifest: pi,
    };

    const parts = [`${name} v${version}`, `⭐ ${stars}`];
    if (extCount) parts.push(`ext:${extCount}`);
    if (skillsCount) parts.push(`skills:${skillsCount}`);
    if (promptsCount) parts.push(`prompts:${promptsCount}`);
    if (themesCount) parts.push(`themes:${themesCount}`);
    if (codeMetrics.tools) parts.push(`tools:${codeMetrics.tools}`);
    if (codeMetrics.commands) parts.push(`cmds:${codeMetrics.commands}`);
    if (deprecated) parts.push("⚠️ deprecated");
    console.log(`  ✅ ${parts.join(" | ")}`);

    updated.push(enriched);
  }

  const outYaml = stringifyYaml({ extensions: updated }, null, 2);
  await writeFile(EXTENSIONS_YAML, outYaml, "utf-8");
  console.log(`\n✨ Done! ${updated.length} entries written to extensions.yaml`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});

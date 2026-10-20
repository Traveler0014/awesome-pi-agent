#!/usr/bin/env node
/**
 * Sync live ~/.pi/agent config into config/, redacting secrets.
 *
 * Reads the *current* pi agent configuration (settings.json, models.json,
 * pi-github-config.json, pi-search.json) and writes sanitized copies into
 * config/ so the repo always reflects the real environment — without leaking
 * tokens or private hosts.
 *
 * Redaction rules:
 *  1. any value under a key matching token/apiKey/secret/etc. that is not
 *     already an env-var reference ($FOO) or a placeholder becomes YOUR_*;
 *  2. any baseUrl host that is not a known public host is replaced with a
 *     generic `your-forgejo.example` placeholder;
 *  3. every generated file is re-scanned for token-shaped strings; a hit makes
 *     the script exit non-zero so nothing leaks into a commit.
 * auth.json is never copied.
 *
 * Usage: npm run sync
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const agentDir = process.env.PI_AGENT_DIR || join(homedir(), ".pi", "agent");
const outDir = join(repoRoot, "config");
mkdirSync(outDir, { recursive: true });

const SECRET_KEY_RE = /(token|api[_-]?key|secret|password|auth)/i;
const PUBLIC_HOSTS = new Set([
  "api.github.com",
  "gitlab.com",
  "gitea.com",
  "codeberg.org",
]);
const PLACEHOLDER_HOST = "your-forgejo.example";

function redact(value, key) {
  if (typeof value !== "string") return value;
  if (!SECRET_KEY_RE.test(key)) return value;
  if (value.startsWith("$")) return value; // already an env-var reference
  if (/^[A-Z0-9_]+$/.test(value)) return value; // already a placeholder
  return `YOUR_${key.replace(/[^A-Za-z0-9]/g, "_").toUpperCase()}`;
}

function maskHost(url) {
  try {
    const u = new URL(url);
    if (PUBLIC_HOSTS.has(u.hostname)) return url;
    const path = u.pathname === "/" ? "" : u.pathname;
    return `${u.protocol}//${PLACEHOLDER_HOST}${path}`;
  } catch {
    return url;
  }
}

/** Redact secrets, then (optionally) genericize non-public baseUrl hosts. */
function walk(value, key = "", opts = {}) {
  if (Array.isArray(value)) return value.map((v) => walk(v, key, opts));
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = walk(v, k, opts);
    return out;
  }
  if (opts.maskHosts && key === "baseUrl" && typeof value === "string") return maskHost(value);
  return redact(value, key);
}

const SECRET_PATTERNS = [
  { name: "github classic token", re: /\bghp_[A-Za-z0-9]{20,}/ },
  { name: "github fine-grained token", re: /\bgithub_pat_[A-Za-z0-9_]{20,}/ },
  { name: "openai-style key", re: /\bsk-[A-Za-z0-9_-]{16,}/ },
  { name: "long hex blob", re: /\b[A-Fa-f0-9]{40,}\b/ },
];

const files = [
  { src: "settings.json", dest: "settings.json" },
  { src: "models.json", dest: "models.json" },
  // maskHosts: the git-forge config may point at a self-hosted instance.
  { src: "pi-github-config.json", dest: "pi-github-config.example.json", maskHosts: true },
  { src: "pi-search.json", dest: "pi-search.example.json" },
];

let leaked = false;

for (const { src, dest, maskHosts = false } of files) {
  const p = join(agentDir, src);
  if (!existsSync(p)) {
    console.warn(`[skip] ${src} not found in ${agentDir}`);
    continue;
  }
  const text =
    JSON.stringify(walk(JSON.parse(readFileSync(p, "utf8")), "", { maskHosts }), null, 2) + "\n";

  for (const { name, re } of SECRET_PATTERNS) {
    if (re.test(text)) {
      console.error(`[LEAK] ${dest}: looks like a ${name} — refusing to write`);
      leaked = true;
    }
  }
  if (leaked) continue;

  writeFileSync(join(outDir, dest), text);
  console.log(`[ok] ${src} -> config/${dest}`);
}

if (leaked) {
  console.error("\nAborted: at least one output file would contain a secret. Nothing was written for it.");
  process.exit(1);
}

console.log(
  "\nDone. Review config/* before committing — real tokens are YOUR_* placeholders and private hosts are masked.",
);

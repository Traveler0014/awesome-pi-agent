#!/usr/bin/env node
/**
 * Sync live ~/.pi/agent config into config/, redacting secrets.
 *
 * Reads the *current* pi agent configuration (settings.json, models.json,
 * pi-github-config.json) and writes sanitized copies into config/ so the repo
 * always reflects the real environment — without leaking tokens.
 *
 * Redaction rule: any value under a key matching token/apiKey/secret/etc. that
 * is not already an env-var reference ($FOO) or a placeholder is replaced with
 * a YOUR_* placeholder. auth.json is never copied.
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

function redact(value, key) {
  if (typeof value !== "string") return value;
  if (!SECRET_KEY_RE.test(key)) return value;
  if (value.startsWith("$")) return value; // already an env-var reference
  if (/^[A-Z0-9_]+$/.test(value)) return value; // already a placeholder
  return `YOUR_${key.replace(/[^A-Za-z0-9]/g, "_").toUpperCase()}`;
}

function walk(value, key = "") {
  if (Array.isArray(value)) return value.map((v) => walk(v, key));
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = walk(v, k);
    return out;
  }
  return redact(value, key);
}

const files = [
  { src: "settings.json", dest: "settings.json" },
  { src: "models.json", dest: "models.json" },
  { src: "pi-github-config.json", dest: "pi-github-config.example.json" },
];

for (const { src, dest } of files) {
  const p = join(agentDir, src);
  if (!existsSync(p)) {
    console.warn(`[skip] ${src} not found in ${agentDir}`);
    continue;
  }
  const data = walk(JSON.parse(readFileSync(p, "utf8")));
  writeFileSync(join(outDir, dest), JSON.stringify(data, null, 2) + "\n");
  console.log(`[ok] ${src} -> config/${dest}`);
}

console.log(
  "\nDone. Review config/* before committing — real tokens are replaced with YOUR_* placeholders.",
);

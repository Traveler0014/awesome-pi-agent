/**
 * generate-readme.ts
 *
 * Generates README.md with a sorted list of all extensions from
 * extensions.yaml, displaying auto-extracted metadata from each
 * package's package.json → pi manifest.
 *
 * Usage: npx tsx scripts/generate-readme.ts
 */

import { parse as parseYaml } from "yaml";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

// ── Types ────────────────────────────────────────────────────────

interface ExtensionEntry {
  repo: string;
  branch?: string;
  description?: string;
  tags?: string[];
  name?: string;
  version?: string;
  updated_at?: string;
  stars?: number;
  deprecated?: boolean;
  extensions_count?: number;
  skills_count?: number;
  prompts_count?: number;
  themes_count?: number;
  tools?: number;
  commands?: number;
  shortcuts?: number;
  pi_manifest?: Record<string, unknown> | null;
}

interface ExtensionsFile {
  extensions: ExtensionEntry[];
}

// ── Constants ────────────────────────────────────────────────────

const EXTENSIONS_YAML = resolve(process.cwd(), "extensions.yaml");
const README_PATH = resolve(process.cwd(), "README.md");

const README_TEMPLATE = `# Awesome Pi Agent Extensions

> A community-curated list of awesome [pi](https://github.com/earendil-works/pi-mono) coding agent extensions and packages.

## What is a pi extension?

Pi extensions are TypeScript modules that extend pi's behavior — they can register custom
tools, add slash commands, intercept events, modify system prompts, and more.
They're distributed as npm packages or git repositories with a \`pi\` manifest in \`package.json\`.

See the [pi extensions documentation](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/docs/extensions.md) for details.

## Extensions

<!-- EXTENSIONS_TABLE_START -->

<!-- EXTENSIONS_TABLE_END -->

## Contributing

To add your extension:

1. Fork this repo
2. Add an entry to \`extensions.yaml\`:

\`\`\`yaml
- repo: github.com/your-username/your-pi-extension
  branch: main
  description: What your extension does
  tags: [tag1, tag2]
\`\`\`

3. Run \`npm run validate\` to check your entry
4. Submit a PR

### Extension requirements

- Must have a valid \`package.json\` at the repo root with a \`pi\` manifest
  (or \`pi-package\` keyword)
- Must be publicly available on GitHub
- Must have a README describing what it does
- Should be functional and reasonably maintained

Metadata like \`tools\`, \`commands\`, resource counts, and \`pi_manifest\` are
auto-extracted by \`npm run update\` (runs daily via GitHub Actions).

## Scripts

| Script | Description |
|--------|-------------|
| \`npm run validate\` | Validate \`extensions.yaml\` structure |
| \`npm run validate:online\` | Also check repos exist on GitHub |
| \`npm run update\` | Clone repos, parse \`package.json\`, extract metadata |
| \`npm run generate-readme\` | Regenerate this README |

## License

[CC0-1.0](LICENSE) — public domain dedication.
`;

// ── Helpers ──────────────────────────────────────────────────────

function repoUrl(repo: string): string {
  return `https://${repo}`;
}

function badge(label: string, color: string): string {
  return `![${label}](https://img.shields.io/badge/${encodeURIComponent(label)}-${color})`;
}

function formatDate(iso: string): string {
  if (!iso) return "-";
  return new Date(iso).toISOString().slice(0, 10);
}

/**
 * Derive a human-readable type label from the pi manifest resource counts.
 */
function deriveTypeLabel(ext: ExtensionEntry): string {
  const parts: string[] = [];
  if (ext.extensions_count) parts.push("🔧 extension");
  if (ext.skills_count) parts.push("📋 skill");
  if (ext.prompts_count) parts.push("💬 prompt");
  if (ext.themes_count) parts.push("🎨 theme");
  return parts.join(" + ") || "📦 package";
}

// ── Table generation ─────────────────────────────────────────────

function generateTable(extensions: ExtensionEntry[]): string {
  if (extensions.length === 0) {
    return `> *No extensions registered yet. [Add yours!](#contributing)*\n`;
  }

  const sorted = [...extensions].sort(
    (a, b) => (b.stars ?? 0) - (a.stars ?? 0)
  );

  let out = "";

  for (const ext of sorted) {
    const url = repoUrl(ext.repo);
    const name = ext.name || ext.repo.split("/").pop() || ext.repo;
    const desc = ext.description || "*No description*";
    const typeLabel = deriveTypeLabel(ext);
    const deprecated = ext.deprecated ? " ⚠️ **Deprecated**" : "";

    out += `### [${name}](${url})\n\n`;
    out += `${desc}${deprecated}\n\n`;
    out += `📦 ${typeLabel}\n\n`;

    // Badges
    const badges: string[] = [];
    if (ext.stars) badges.push(badge(`⭐ ${ext.stars}`, "yellow"));
    if (ext.version) badges.push(badge(`v${ext.version}`, "blue"));
    if (ext.tools) badges.push(badge(`🛠 ${ext.tools} tools`, "green"));
    if (ext.commands) badges.push(badge(`⌨ ${ext.commands} cmds`, "orange"));
    if (ext.shortcuts) badges.push(badge(`🔑 ${ext.shortcuts} shortcuts`, "purple"));
    if (badges.length > 0) out += badges.join("  ") + "\n\n";

    // Resource counts
    if (ext.extensions_count || ext.skills_count || ext.prompts_count || ext.themes_count) {
      const r: string[] = [];
      if (ext.extensions_count) r.push(`${ext.extensions_count} extension file(s)`);
      if (ext.skills_count) r.push(`${ext.skills_count} skill(s)`);
      if (ext.prompts_count) r.push(`${ext.prompts_count} prompt(s)`);
      if (ext.themes_count) r.push(`${ext.themes_count} theme(s)`);
      out += r.join(" · ") + "\n\n";
    }

    if (ext.tags && ext.tags.length > 0) {
      out += ext.tags.map((t) => `\`#${t}\``).join(" ") + "\n\n";
    }

    if (ext.updated_at) {
      out += `📅 Updated: ${formatDate(ext.updated_at)}\n\n`;
    }

    out += `---\n\n`;
  }

  return out;
}

// ── Main ─────────────────────────────────────────────────────────

async function main() {
  console.log("📖 Reading extensions.yaml...");
  const raw = await readFile(EXTENSIONS_YAML, "utf-8");
  const data = parseYaml(raw) as ExtensionsFile;

  const extensions = data.extensions || [];
  console.log(`📊 Found ${extensions.length} extensions`);

  const table = generateTable(extensions);
  const readme = README_TEMPLATE.replace(
    "<!-- EXTENSIONS_TABLE_START -->\n\n<!-- EXTENSIONS_TABLE_END -->",
    `<!-- EXTENSIONS_TABLE_START -->\n\n${table}<!-- EXTENSIONS_TABLE_END -->`
  );

  await writeFile(README_PATH, readme, "utf-8");
  console.log("✨ README.md generated!");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});

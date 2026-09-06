import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, relative, resolve } from "node:path";

const CONFIG_FILE = "config/public-projection.yml";
const REQUIRED_POLICY = {
  input_owner: "Obsidian Vault",
  write_policy: "compiler-only",
  publish_policy: "approved-documents-only",
  site_behavior: "read-only-build-input"
};
const PRIVATE_CONTENT_PATTERNS = [
  ["Obsidian wikilink", /\[\[[^\]]+\]\]/u],
  ["local file path", /(?:file:\/\/|\/Users\/|~\/)/u],
  ["private source link", /(?:\]\(|href=["'])(?:\.\.\/)*(?:wiki\/private|sources|private)\//u],
  ["source session ID", /source_session_ids?\s*[:=]/iu]
];

function scalarValue(config, key) {
  const match = config.match(new RegExp(`^${key}:\\s*(.+?)\\s*$`, "mu"));
  if (!match) {
    throw new Error(`Projection config is missing ${key}.`);
  }
  return match[1].replace(/^['"]|['"]$/gu, "");
}

function listValue(config, key) {
  const match = config.match(new RegExp(`^${key}:\\s*$((?:\\n[ \\t]+- .+)+)`, "mu"));
  if (!match) {
    throw new Error(`Projection config is missing the ${key} list.`);
  }
  return [...match[1].matchAll(/^\s+-\s+(.+?)\s*$/gmu)].map(([, value]) => value);
}

function parseFrontMatter(source, filename) {
  const match = source.match(/^---\s*\n([\s\S]*?)\n---\s*(?:\n|$)/u);
  if (!match) {
    throw new Error(`${filename} must start with YAML front matter.`);
  }

  const values = new Map();
  for (const line of match[1].split("\n")) {
    const field = line.match(/^([a-z0-9_]+):\s*(.+?)\s*$/u);
    if (field) {
      values.set(field[1], field[2].replace(/^['"]|['"]$/gu, ""));
    }
  }
  return values;
}

async function markdownFiles(root) {
  const entries = await readdir(root, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const item = resolve(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await markdownFiles(item)));
    } else if (entry.isFile() && entry.name.endsWith(".md") && entry.name !== "README.md") {
      files.push(item);
    }
  }
  return files.sort();
}

function assertPolicy(config) {
  for (const [key, expected] of Object.entries(REQUIRED_POLICY)) {
    const actual = scalarValue(config, key);
    if (actual !== expected) {
      throw new Error(`Projection config ${key} must be ${JSON.stringify(expected)}.`);
    }
  }

  const prohibited = listValue(config, "privacy_prohibited");
  const expectedProhibited = [
    "obsidian-wikilink",
    "local-file-path",
    "private-source-link",
    "source-session-id"
  ];
  if (prohibited.join(",") !== expectedProhibited.join(",")) {
    throw new Error("Projection config privacy_prohibited must list every enforced boundary.");
  }
}

export async function validatePublicProjection(siteRoot) {
  const root = resolve(siteRoot);
  const config = await readFile(resolve(root, CONFIG_FILE), "utf8");
  assertPolicy(config);

  const contentRoot = scalarValue(config, "content_root");
  const generatedRoot = resolve(root, contentRoot);
  if (generatedRoot !== resolve(root, "generated/public-content")) {
    throw new Error("Projection content_root must stay inside generated/public-content.");
  }

  const requiredFields = listValue(config, "required_front_matter");
  const files = await markdownFiles(generatedRoot);
  for (const item of files) {
    const filename = relative(root, item);
    const source = await readFile(item, "utf8");
    const values = parseFrontMatter(source, filename);

    for (const field of requiredFields) {
      if (!values.get(field)) {
        throw new Error(`${filename} is missing required front matter: ${field}.`);
      }
    }
    if (values.get("publication_state") !== "publish") {
      throw new Error(`${filename} must have publication_state: publish.`);
    }
    if (!/^[a-f0-9]{64}$/iu.test(values.get("projection_sha256"))) {
      throw new Error(`${filename} must carry a 64-character projection_sha256.`);
    }

    for (const [label, pattern] of PRIVATE_CONTENT_PATTERNS) {
      if (pattern.test(source)) {
        throw new Error(`${filename} contains prohibited ${label}.`);
      }
    }
  }

  return { contentRoot, documents: files.length };
}

async function main() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const report = await validatePublicProjection(root);
  console.log(`Public projection is valid: ${String(report.documents)} document(s) in ${report.contentRoot}.`);
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

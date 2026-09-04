import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const languagesFile = resolve(root, "vendor/runnable-code-blocks/src/supported-languages.ts");
const playgroundFile = resolve(root, "docs/ui-components/runnable-code-blocks.md");

const [languagesSource, playground] = await Promise.all([
  readFile(languagesFile, "utf8"),
  readFile(playgroundFile, "utf8")
]);

const supported = new Set([
  ...languagesSource.matchAll(/language\(\s*\{\s*id:\s*"([a-z0-9+#-]+)"/gu),
  ...languagesSource.matchAll(/language\("([a-z0-9+#-]+)"/gu)
].map(([, language]) => language));
const documentedFences = [...playground.matchAll(/^```run-([a-z0-9+#-]+)\s*$/gmu)].map(([, language]) => language);
const documented = new Set(documentedFences);

const missing = [...supported].filter((language) => !documented.has(language));
const unknown = [...documented].filter((language) => !supported.has(language));
const duplicates = [...documented].filter((language) => documentedFences.filter((entry) => entry === language).length !== 1);

if (missing.length || unknown.length || duplicates.length) {
  const details = [
    missing.length ? `missing: ${missing.join(", ")}` : "",
    unknown.length ? `unknown: ${unknown.join(", ")}` : "",
    duplicates.length ? `duplicates: ${duplicates.join(", ")}` : ""
  ].filter(Boolean);
  throw new Error(`Runnable playground coverage failed (${details.join("; ")})`);
}

console.log(`Runnable playground documents all ${String(supported.size)} supported languages exactly once.`);

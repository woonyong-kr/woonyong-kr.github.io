import { copyFile, mkdir, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const adapter = resolve(root, "vendor/runnable-code-blocks");
const esbuild = resolve(adapter, "node_modules/.bin/esbuild");
const source = resolve(root, "tools/runnable-code-blocks.ts");
const scriptOutput = resolve(root, "assets/js/runnable-code-blocks.js");
const styleOutput = resolve(root, "assets/css/runnable-code-blocks.css");

await stat(esbuild);
await mkdir(resolve(root, "assets/js"), { recursive: true });
await mkdir(resolve(root, "assets/css"), { recursive: true });

const build = spawnSync(esbuild, [
  source,
  "--bundle",
  "--format=esm",
  "--platform=browser",
  "--target=es2022",
  "--minify",
  `--outfile=${scriptOutput}`,
], { stdio: "inherit" });

if (build.status !== 0) process.exit(build.status ?? 1);
await copyFile(resolve(adapter, "styles.css"), styleOutput);

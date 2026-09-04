import { copyFile, mkdir, stat } from "node:fs/promises";
import { resolve } from "node:path";
import * as esbuild from "../vendor/runnable-code-blocks/node_modules/esbuild/lib/main.js";
import { reactRuntimePlugin } from "../vendor/runnable-code-blocks/scripts/react-runtime-plugin.mjs";

const root = resolve(import.meta.dirname, "..");
const adapter = resolve(root, "vendor/runnable-code-blocks");
const source = resolve(root, "tools/runnable-code-blocks.ts");
const scriptOutput = resolve(root, "assets/js/runnable-code-blocks.js");
const styleOutput = resolve(root, "assets/css/runnable-code-blocks.css");

await stat(resolve(adapter, "node_modules/esbuild/lib/main.js"));
await mkdir(resolve(root, "assets/js"), { recursive: true });
await mkdir(resolve(root, "assets/css"), { recursive: true });

await esbuild.build({
  bundle: true,
  entryPoints: [source],
  format: "esm",
  minify: true,
  outfile: scriptOutput,
  platform: "browser",
  plugins: [reactRuntimePlugin()],
  target: "es2022",
});
await copyFile(resolve(adapter, "styles.css"), styleOutput);

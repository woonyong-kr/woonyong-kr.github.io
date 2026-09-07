import { copyFile, mkdir, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import * as esbuild from '../vendor/runnable-code-blocks/node_modules/esbuild/lib/main.js';
import { reactRuntimePlugin } from '../vendor/runnable-code-blocks/scripts/react-runtime-plugin.mjs';

const root = resolve(import.meta.dirname, '..');
const output = resolve(root, 'assets/js/runnable');
// This directory is generated exclusively by this build and ignored by Git.
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
const result = await esbuild.build({
  absWorkingDir: root,
  bundle: true, entryPoints: { loader: resolve(root, 'tools/runnable-code-blocks.ts') },
  format: 'esm', splitting: true, minify: true, metafile: true, outdir: output,
  entryNames: '[name]', chunkNames: '[name]-[hash]', platform: 'browser',
  plugins: [reactRuntimePlugin()], target: 'es2022',
});
await mkdir(resolve(root, '.jekyll-cache'), { recursive: true });
await writeFile(resolve(root, '.jekyll-cache/runnable-meta.json'), JSON.stringify(result.metafile));
await copyFile(resolve(root, 'vendor/runnable-code-blocks/styles.css'), resolve(root, 'assets/css/runnable-code-blocks.css'));

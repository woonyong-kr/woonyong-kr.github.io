import { copyFile, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import * as esbuild from '../vendor/runnable-code-blocks/node_modules/esbuild/lib/main.js';

const root = resolve(import.meta.dirname, '..');
const output = resolve(root, 'assets/js/diagrams');
// This directory contains only ignored build output from this script.
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
const result = await esbuild.build({
  absWorkingDir: root,
  entryPoints: { loader: 'tools/diagrams.ts' },
  bundle: true, format: 'esm', splitting: true, minify: true,
  metafile: true, outdir: output, entryNames: '[name]', chunkNames: '[name]-[hash]',
  platform: 'browser', target: 'es2022', legalComments: 'inline',
});
await mkdir(resolve(root, '.jekyll-cache'), { recursive: true });
await writeFile(resolve(root, '.jekyll-cache/diagrams-meta.json'), JSON.stringify(result.metafile));
await copyFile(resolve(root, 'node_modules/mermaid/LICENSE'), resolve(output, 'LICENSE.txt'));

// Preserve the notices of the actual bundled packages, including lazy diagrams.
const packagePaths = new Set();
for (const input of Object.keys(result.metafile.inputs)) {
  const start = input.lastIndexOf('node_modules/');
  if (start < 0) continue;
  const parts = input.slice(start + 13).split('/');
  const name = parts.slice(0, parts[0].startsWith('@') ? 2 : 1).join('/');
  packagePaths.add(input.slice(0, start + 13) + name);
}
const notices = [];
for (const path of [...packagePaths].sort()) {
  const directory = resolve(root, path);
  const pkg = JSON.parse(await readFile(resolve(directory, 'package.json'), 'utf8'));
  const names = (await readdir(directory, { withFileTypes: true }))
    .filter(entry => entry.isFile() && /^(LICENSE|LICENCE|COPYING|NOTICE)(\.|$)/iu.test(entry.name))
    .map(entry => entry.name).sort();
  let texts = await Promise.all(names.map(name => readFile(resolve(directory, name), 'utf8')));
  if (texts.length === 0) {
    const readme = await readFile(resolve(directory, 'README.md'), 'utf8');
    const license = readme.match(/^## License\s*\n([\s\S]*)/imu)?.[1];
    if (!license) throw new Error(`Bundled package has no license text: ${pkg.name}`);
    texts = [license];
  }
  notices.push(`${pkg.name} ${pkg.version}\n\n${texts.join('\n\n')}`);
}
await writeFile(resolve(output, 'THIRD_PARTY_NOTICES.txt'), notices.join('\n\n--------------------\n\n'));

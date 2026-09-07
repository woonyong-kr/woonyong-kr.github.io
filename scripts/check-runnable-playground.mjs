import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { build } from '../vendor/runnable-code-blocks/node_modules/esbuild/lib/main.js';

const root = resolve(import.meta.dirname, '..');
const result = await build({
  entryPoints: [resolve(root, 'vendor/runnable-code-blocks/src/language-catalog.ts')],
  bundle: true, format: 'esm', platform: 'node', write: false,
});
const { SUPPORTED_LANGUAGES, parseRunnableFence } = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
const playground = await readFile(resolve(root, 'docs/ui-components/runnable-code-blocks.md'), 'utf8');
const documented = [...playground.matchAll(/^```(run-[^\s]+)\s*$/gmu)].map(([, fence]) => parseRunnableFence(fence));
const supported = new Set(SUPPORTED_LANGUAGES.map(language => language.id));
const missing = [...supported].filter(language => !documented.includes(language));
const unknown = documented.filter(language => !supported.has(language));
if (missing.length || unknown.length) throw new Error(`Showcase fence contract: missing [${missing}], unknown [${unknown}]`);
console.log(`Showcase covers ${supported.size} supported public fences.`);

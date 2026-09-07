import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const revision = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
await mkdir(resolve(root, '.jekyll-cache'), { recursive: true });
await writeFile(resolve(root, '.jekyll-cache/build.yml'), `github:\n  build_revision: ${JSON.stringify(revision)}\n`);
execFileSync('bundle', ['exec', 'jekyll', 'build', '--config', '_config.yml,.jekyll-cache/build.yml', '--destination', '_site'], { cwd: root, stdio: 'inherit' });

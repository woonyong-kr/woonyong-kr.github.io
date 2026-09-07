import { lstat, readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { isAlias, isMap, isPair, parseDocument, visit } from 'yaml';

export function parseYaml(source, label) {
  const doc = parseDocument(source, { version: '1.1', uniqueKeys: true, stringKeys: true, strict: true });
  if (doc.errors.length || doc.warnings.length || !isMap(doc.contents)) {
    throw new Error(`${label}: invalid YAML mapping (${[...doc.errors, ...doc.warnings].map(e => e.message).join('; ')})`);
  }
  visit(doc, (_, node) => {
    if (node && (isAlias(node) || node.anchor || node.tag || (isPair(node) && node.key?.source === '<<'))) {
      throw new Error(`${label}: YAML aliases, anchors, merge keys and tags are not supported`);
    }
  });
  return doc.toJS();
}

export function frontMatter(source, label) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u);
  if (!match) throw new Error(`${label}: missing YAML front matter`);
  return parseYaml(match[1], label);
}

export async function filesUnder(root) {
  if (!(await lstat(root)).isDirectory()) throw new Error(`${root}: must be a real directory`);
  const files = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const path = resolve(root, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`${path}: symbolic links are not allowed`);
    if (entry.isDirectory()) files.push(...await filesUnder(path));
    else if (entry.isFile()) files.push(path);
    else throw new Error(`${path}: unsupported file type`);
  }
  return files.sort();
}

export async function siteConfig(root) {
  return parseYaml(await readFile(resolve(root, '_config.yml'), 'utf8'), '_config.yml');
}

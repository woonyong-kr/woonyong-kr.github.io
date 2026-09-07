import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, relative, resolve } from 'node:path';
import { filesUnder, frontMatter, parseYaml } from './site-policy.mjs';

const CONTENT_ROOT = 'generated/public-content';
const REQUIRED_FIELDS = ['layout', 'title', 'nav_order', 'permalink', 'publication_state', 'projection_id', 'projection_sha256'];
const OPTIONAL_FIELDS = ['has_toc', 'parent', 'grand_parent', 'ancestor', 'content_status', 'public_parent_id', 'search_terms'];
const REQUIRED_POLICY = {
  input_owner: 'Obsidian Vault', write_policy: 'compiler-only',
  publish_policy: 'approved-documents-only', site_behavior: 'read-only-build-input',
  content_root: CONTENT_ROOT,
};
const PROHIBITED = ['obsidian-wikilink', 'local-file-path', 'private-source-link', 'source-session-id'];
const PRIVATE_CONTENT_PATTERNS = [
  ['Obsidian wikilink', /\[\[[^\]]+\]\]/u],
  ['local file path', /(?:file:\/\/|\/Users\/|~\/)/u],
  ['private source link', /(?:\]\(|href=["'])(?:\/?(?:\.\.\/)*)(?:wiki\/private|sources|private)\//u],
  ['source session ID', /source_session_ids?\s*[:=]/iu],
];

function sameMembers(actual, expected) {
  return Array.isArray(actual) && actual.length === expected.length && expected.every(item => actual.includes(item));
}

export async function readPublicProjection(root) {
  const config = parseYaml(await readFile(resolve(root, 'config/public-projection.yml'), 'utf8'), 'projection config');
  for (const [key, expected] of Object.entries(REQUIRED_POLICY)) {
    if (config[key] !== expected) throw new Error(`Projection config ${key} must be ${JSON.stringify(expected)}`);
  }
  if (!sameMembers(config.required_front_matter, REQUIRED_FIELDS) || !sameMembers(config.privacy_prohibited, PROHIBITED)) {
    throw new Error('Projection config must enforce all required metadata and privacy boundaries');
  }
  const documents = [];
  const identities = new Set();
  const permalinks = new Set();
  for (const item of await filesUnder(resolve(root, CONTENT_ROOT))) {
    const filename = relative(root, item);
    if (filename === `${CONTENT_ROOT}/README.md`) continue;
    if (!filename.endsWith('.md')) throw new Error(`${filename}: only Markdown projection inputs are allowed`);
    const source = await readFile(item, 'utf8');
    const values = frontMatter(source, filename);
    for (const field of REQUIRED_FIELDS) {
      if (!(field in values)) throw new Error(`${filename}: missing required front matter: ${field}`);
    }
    for (const [field, value] of Object.entries(values)) {
      if (![...REQUIRED_FIELDS, ...OPTIONAL_FIELDS].includes(field)) throw new Error(`${filename}: unexpected field ${field}`);
      if (field === 'nav_order') {
        if (!Number.isSafeInteger(value) || value < 0) throw new Error(`${filename}: nav_order must be a nonnegative integer`);
      } else if (field === 'has_toc') {
        if (typeof value !== 'boolean') throw new Error(`${filename}: has_toc must be boolean`);
      } else if (field === 'search_terms') {
        if (!Array.isArray(value) || value.some(term => typeof term !== 'string' || !term.trim())) throw new Error(`${filename}: search_terms must be a list of nonempty strings`);
      } else if (typeof value !== 'string' || !value.trim()) throw new Error(`${filename}: ${field} must be a nonempty string`);
    }
    if (values.layout !== 'default' || values.publication_state !== 'publish') throw new Error(`${filename}: only default-layout published documents are allowed`);
    if (values.content_status && !['planned', 'overview', 'ready'].includes(values.content_status)) throw new Error(`${filename}: invalid content_status`);
    if (!/^\/wiki\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/u.test(values.permalink)) throw new Error(`${filename}: invalid public Wiki permalink`);
    if (!/^[a-f0-9]{64}$/u.test(values.projection_sha256)) throw new Error(`${filename}: invalid projection_sha256 metadata`);
    for (const [set, value, name] of [[identities, values.projection_id, 'projection_id'], [permalinks, values.permalink, 'permalink']]) {
      if (set.has(value)) throw new Error(`${filename}: duplicate ${name}: ${value}`);
      set.add(value);
    }
    for (const [label, pattern] of PRIVATE_CONTENT_PATTERNS) {
      if (pattern.test(source)) throw new Error(`${filename} contains prohibited ${label}`);
    }
    documents.push({ filename, ...values });
  }
  return documents;
}

export async function validatePublicProjection(siteRoot) {
  return { contentRoot: CONTENT_ROOT, documents: (await readPublicProjection(resolve(siteRoot))).length };
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  validatePublicProjection(resolve(dirname(fileURLToPath(import.meta.url)), '..')).then(report => {
    console.log(`Public projection is valid: ${report.documents} document(s) in ${report.contentRoot}.`);
  }).catch(error => { console.error(error.message); process.exitCode = 1; });
}

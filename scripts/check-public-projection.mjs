import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, relative, resolve } from 'node:path';
import { filesUnder, frontMatter, parseYaml } from './site-policy.mjs';

const CONTENT_ROOT = 'generated/public-content';
const REQUIRED_FIELDS = ['layout', 'title', 'nav_order', 'permalink', 'publication_state', 'projection_id', 'projection_sha256'];
const OPTIONAL_FIELDS = ['has_toc', 'parent', 'grand_parent', 'ancestor', 'content_status', 'public_parent_id', 'search_terms'];
const REDIRECT_FIELDS = ['layout', 'permalink', 'redirect_target', 'nav_exclude', 'search_exclude', 'sitemap'];
const PUBLIC_URL = /^\/wiki\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/u;
const LEGACY_PUBLIC_PATH = /^\/wiki\/[a-z0-9]+(?:-[a-z0-9]+)*\/[a-z0-9]+(?:-[a-z0-9]+)*(?:\/|\.html)$/u;
const PRIVATE_ROUTE_SEGMENTS = new Set(['private', 'sources', 'catalog', 'personal', 'local-only']);

function legacyPublicPath(value) {
  return typeof value === 'string' && LEGACY_PUBLIC_PATH.test(value)
    && !value.slice(6).replace(/\/$|\.html$/u, '').split('/').some(part => PRIVATE_ROUTE_SEGMENTS.has(part));
}

export function publicOutputPath(permalink) {
  if (!PUBLIC_URL.test(permalink) && !legacyPublicPath(permalink)) throw new Error('Invalid public output path');
  return permalink.slice(1) + (permalink.endsWith('/') ? 'index.html' : '');
}

function redirectInputPath(permalink) {
  if (PUBLIC_URL.test(permalink)) return `${CONTENT_ROOT}/${permalink.slice(6, -1)}.html`;
  if (legacyPublicPath(permalink)) return `${CONTENT_ROOT}/legacy-paths/${publicOutputPath(permalink).slice(5)}`;
  return null;
}
const REDIRECT_BODY = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="robots" content="noindex">
<title>문서가 이동했습니다</title>
<link rel="canonical" href="{{ page.redirect_target | absolute_url | escape }}">
<meta http-equiv="refresh" content="0; url={{ page.redirect_target | relative_url | escape }}">
</head>
<body><p><a href="{{ page.redirect_target | relative_url | escape }}">문서 열기</a></p></body>
</html>`;
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

// Match the compiler's top-level Markdown fences without changing literal bytes.
function withoutFencedCode(source) {
  let marker = null;
  return source.split(/(?<=\n)/u).map(line => {
    if (marker) {
      const closing = line.match(/^ {0,3}(`+|~+)[ \t]*(?:\r?\n)?$/u);
      if (closing && closing[1][0] === marker[0] && closing[1].length >= marker.length) marker = null;
      return "\n";
    }
    const opening = line.match(/^ {0,3}(`{3,}|~{3,})([^\r\n]*)(?:\r?\n)?$/u);
    if (opening && !(opening[1][0] === "`" && opening[2].includes("`"))) {
      marker = opening[1];
      return "\n";
    }
    return line;
  }).join("");
}

function sameMembers(actual, expected) {
  return Array.isArray(actual) && actual.length === expected.length && expected.every(item => actual.includes(item));
}

export async function readPublicProjectionBundle(root) {
  const config = parseYaml(await readFile(resolve(root, 'config/public-projection.yml'), 'utf8'), 'projection config');
  for (const [key, expected] of Object.entries(REQUIRED_POLICY)) {
    if (config[key] !== expected) throw new Error(`Projection config ${key} must be ${JSON.stringify(expected)}`);
  }
  if (!sameMembers(config.required_front_matter, REQUIRED_FIELDS) || !sameMembers(config.privacy_prohibited, PROHIBITED)) {
    throw new Error('Projection config must enforce all required metadata and privacy boundaries');
  }
  const documents = [];
  const redirects = [];
  const identities = new Set();
  const permalinks = new Set();
  const outputFiles = new Set();
  function reserveOutput(permalink, filename) {
    const output = publicOutputPath(permalink);
    if (outputFiles.has(output)) throw new Error(`${filename}: duplicate public output file`);
    outputFiles.add(output);
  }
  for (const item of await filesUnder(resolve(root, CONTENT_ROOT))) {
    const filename = relative(root, item);
    if (filename === `${CONTENT_ROOT}/README.md`) continue;
    const source = await readFile(item, 'utf8');
    const values = frontMatter(source, filename);
    if (filename.endsWith('.html')) {
      if (!sameMembers(Object.keys(values), REDIRECT_FIELDS)
          || values.layout !== null || values.nav_exclude !== true
          || values.search_exclude !== true || values.sitemap !== false
          || !redirectInputPath(values.permalink) || !PUBLIC_URL.test(values.redirect_target)
          || values.permalink === values.redirect_target
          || filename !== redirectInputPath(values.permalink)) {
        throw new Error(`${filename}: invalid public redirect metadata`);
      }
      const body = source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/u, '').trim();
      if (body !== REDIRECT_BODY) throw new Error(`${filename}: redirect must use the canonical static body`);
      if (permalinks.has(values.permalink)) throw new Error(`${filename}: duplicate permalink`);
      permalinks.add(values.permalink);
      reserveOutput(values.permalink, filename);
      redirects.push({ filename, ...values });
      continue;
    }
    if (!filename.endsWith('.md')) throw new Error(`${filename}: unsupported projection input`);
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
    if (!PUBLIC_URL.test(values.permalink)) throw new Error(`${filename}: invalid public Wiki permalink`);
    reserveOutput(values.permalink, filename);
    if (!/^[a-f0-9]{64}$/u.test(values.projection_sha256)) throw new Error(`${filename}: invalid projection_sha256 metadata`);
    for (const [set, value, name] of [[identities, values.projection_id, 'projection_id'], [permalinks, values.permalink, 'permalink']]) {
      if (set.has(value)) throw new Error(`${filename}: duplicate ${name}: ${value}`);
      set.add(value);
    }
    for (const [label, pattern] of PRIVATE_CONTENT_PATTERNS) {
      if (pattern.test(label === "Obsidian wikilink" ? withoutFencedCode(source) : source)) {
        throw new Error(`${filename} contains prohibited ${label}`);
      }
    }
    documents.push({ filename, ...values });
  }
  const targets = new Set(documents.map(document => document.permalink));
  for (const redirect of redirects) {
    if (!targets.has(redirect.redirect_target)) throw new Error(`${redirect.filename}: redirect must target a canonical public document`);
  }
  return { documents, redirects };
}

export async function readPublicProjection(root) {
  return (await readPublicProjectionBundle(root)).documents;
}

export async function validatePublicProjection(siteRoot) {
  const { documents, redirects } = await readPublicProjectionBundle(resolve(siteRoot));
  return { contentRoot: CONTENT_ROOT, documents: documents.length, ...(redirects.length ? { redirects: redirects.length } : {}) };
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  validatePublicProjection(resolve(dirname(fileURLToPath(import.meta.url)), '..')).then(report => {
    console.log(`Public projection is valid: ${report.documents} document(s), ${report.redirects ?? 0} redirect(s) in ${report.contentRoot}.`);
  }).catch(error => { console.error(error.message); process.exitCode = 1; });
}

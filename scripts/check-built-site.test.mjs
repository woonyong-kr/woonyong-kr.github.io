import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { inspectRenderedHtml, checkFileList } from './check-built-site.mjs';
import { parseYaml } from './site-policy.mjs';

const base = 'https://docs.example.com/wiki/example/';
const render = markdown => execFileSync('bundle', ['exec', 'ruby', '-rjekyll', '-e', 'config=Jekyll.configuration({"quiet"=>true}); puts Jekyll::Converters::Markdown.new(config).convert(STDIN.read)'], { input: markdown, encoding: 'utf8' });

test('Jekyll and the boundary parser agree on compiler-shaped YAML', () => {
  const yaml = 'title: "No"\nnav_order: 12\nhas_toc: false\nparent: "한국어: 문서"\npermalink: /wiki/example/\n';
  const jekyll = execFileSync('bundle', ['exec', 'ruby', '-rjekyll', '-rjson', '-e', 'puts SafeYAML.load(STDIN.read).to_json'], { input: yaml, encoding: 'utf8' });
  assert.deepEqual(parseYaml(yaml, 'fixture'), JSON.parse(jekyll));
});

for (const [name, yaml] of [
  ['multiple YAML documents', 'title: first\n---\ntitle: second'],
  ['explicit tags', 'title: !!str text'],
  ['merge keys', 'defaults: &defaults {title: example}\n<<: *defaults'],
]) test(`rejects ${name}`, () => assert.throws(() => parseYaml(yaml, name)));

test('rendered Markdown reference links, HTML entities, relative URLs and srcset cannot bypass the boundary', () => {
  const fixture = readFileSync(new URL('../tests/fixtures/public-boundary.md', import.meta.url), 'utf8');
  const html = render(fixture);
  assert.throws(() => inspectRenderedHtml(html, base), /prohibited/u);
  for (const source of [
    '[link][ref]\n\n[ref]: /%70rivate/note/',
    '<a href="/&#112;rivate/note/">link</a>',
    '<a href="../%252e%252e/private/note/">link</a>',
    '<img srcset="/public.png 1x, /%55sers/person/secret.png 2x">',
    '<a href="file&#58;///tmp/note">local</a>',
    '<a href="http://2130706433/secret">loopback</a>',
    '<base href="/private/"><a href="note">link</a>',
  ]) assert.throws(() => inspectRenderedHtml(render(source), base), /prohibited/u, source);
  assert.doesNotThrow(() => inspectRenderedHtml(render('[public](/wiki/home/)\n\n<a href="https://example.com/reference">reference</a>'), base));
});

test('unexpected deploy files and missing approved pages fail independently', () => {
  assert.throws(() => checkFileList(['index.html', 'private.html'], new Set(['index.html'])), /unexpected \[private.html\]/u);
  assert.throws(() => checkFileList([], new Set(['index.html'])), /missing \[index.html\]/u);
});

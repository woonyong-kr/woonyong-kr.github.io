import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import test from 'node:test';
import { inspectRenderedRedirect } from './check-built-site.mjs';

test('Jekyll preserves both legacy URL forms and rejects an occupied output file', async () => {
  const root = await mkdtemp(resolve(tmpdir(), 'wn-legacy-paths-'));
  const source = resolve(root, 'source');
  const output = resolve(root, 'output');
  const directory = resolve(source, 'legacy-paths/algorithm/linear-data-structures');
  await mkdir(directory, { recursive: true });
  await writeFile(resolve(source, 'target.md'), '---\nlayout: null\npermalink: /wiki/data-structures/\nprojection_id: structures\ncontent_status: ready\n---\nReady content');
  const paths = [
    ['/wiki/algorithm/linear-data-structures/', 'legacy-paths/algorithm/linear-data-structures/index.html', 'wiki/algorithm/linear-data-structures/index.html'],
    ['/wiki/algorithm/linear-data-structures.html', 'legacy-paths/algorithm/linear-data-structures.html', 'wiki/algorithm/linear-data-structures.html'],
  ];
  for (const [url, input] of paths) await writeFile(resolve(source, input), `---\nlayout: null\npermalink: ${url}\nredirect_target: /wiki/data-structures/\nnav_exclude: true\nsearch_exclude: true\nsitemap: false\n---\n<!doctype html><html><head><meta name="robots" content="noindex"><link rel="canonical" href="{{ page.redirect_target | absolute_url | escape }}"><meta http-equiv="refresh" content="0; url={{ page.redirect_target | relative_url | escape }}"></head><body><a href="{{ page.redirect_target | relative_url | escape }}">Open</a></body></html>`);
  const config = { source, destination: output, config: [], quiet: true, url: 'https://docs.example.com', baseurl: '/preview', plugins_dir: [resolve(import.meta.dirname, '../_plugins')], wiki_show_planned: true };
  const build = () => execFileSync('bundle', ['exec', 'ruby', '-rjekyll', '-rjson', '-e', 'Jekyll::Site.new(Jekyll.configuration(JSON.parse(STDIN.read))).process'], { input: JSON.stringify(config), encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  try {
    build();
    for (const [url, , path] of paths) inspectRenderedRedirect(await readFile(resolve(output, path), 'utf8'), 'https://docs.example.com/preview/wiki/data-structures/', `https://docs.example.com/preview${url}`);
    await mkdir(resolve(source, 'wiki/algorithm'), { recursive: true });
    for (const filename of ['linear-data-structures.html', 'linear-data-structures']) {
      const occupied = resolve(source, 'wiki/algorithm', filename);
      await writeFile(occupied, 'Existing static content');
      assert.throws(build, /Redirect output conflicts with another page or static file/u);
      await rm(occupied);
    }
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('Jekyll visibility switch changes HTML, navigation, search and sitemap together', async () => {
  const root = await mkdtemp(resolve(tmpdir(), 'wn-visibility-'));
  const source = resolve(root, 'source');
  const output = resolve(root, 'output');
  await mkdir(resolve(source, '_layouts'), { recursive: true });
  await writeFile(resolve(source, '_layouts/default.html'), '<main>{{ content }}</main><nav>{% for item in site.pages %}{% if item.projection_id %}<a href="{{ item.url }}">{{ item.title }}</a>{% endif %}{% endfor %}</nav>');
  const pages = [['root', 'overview', ''], ['branch', 'planned', 'root'], ['ready', 'ready', 'branch'], ['future', 'planned', 'branch']];
  for (const [id, status, parent] of pages) await writeFile(resolve(source, `${id}.md`), `---\nlayout: default\ntitle: ${id}\npermalink: /wiki/${id}/\nprojection_id: ${id}\ncontent_status: ${status}\n${parent ? `public_parent_id: ${parent}\n` : ''}---\n\n# ${id}\n`);
  for (const target of ['branch', 'future']) {
    await writeFile(resolve(source, `old-${target}.html`), `---\nlayout: null\npermalink: /wiki/old-${target}/\nredirect_target: /wiki/${target}/\nnav_exclude: true\nsearch_exclude: true\nsitemap: false\n---\n<!doctype html><html><head><meta name="robots" content="noindex"><link rel="canonical" href="{{ page.redirect_target | absolute_url | escape }}"><meta http-equiv="refresh" content="0; url={{ page.redirect_target | relative_url | escape }}"></head><body><a href="{{ page.redirect_target | relative_url | escape }}">Open</a></body></html>`);
  }
  await writeFile(resolve(source, 'search.json'), '---\n---\n[{% assign pages = site.pages | where_exp: "p", "p.projection_id" %}{% for p in pages %}{{ p.url | jsonify }}{% unless forloop.last %},{% endunless %}{% endfor %}]');
  try {
    for (const visible of [false, true]) {
      const config = { source, destination: output, config: [], quiet: true, url: 'https://docs.example.com', baseurl: '/preview', plugins: ['jekyll-sitemap'], plugins_dir: [resolve(import.meta.dirname, '../_plugins')], wiki_show_planned: visible };
      execFileSync('bundle', ['exec', 'ruby', '-rjekyll', '-rjson', '-e', 'Jekyll::Site.new(Jekyll.configuration(JSON.parse(STDIN.read))).process'], { input: JSON.stringify(config), encoding: 'utf8' });
      const home = await readFile(resolve(output, 'wiki/root/index.html'), 'utf8');
      const search = JSON.parse(await readFile(resolve(output, 'search.json'), 'utf8'));
      const sitemap = await readFile(resolve(output, 'sitemap.xml'), 'utf8');
      assert.deepEqual(search.sort(), (visible ? ['/wiki/root/', '/wiki/branch/', '/wiki/ready/', '/wiki/future/'] : ['/wiki/root/', '/wiki/branch/', '/wiki/ready/']).sort());
      assert.equal(home.includes('href="/wiki/future/"'), visible);
      assert.equal(sitemap.includes('/wiki/future/'), visible);
      if (visible) await access(resolve(output, 'wiki/future/index.html'));
      else await assert.rejects(access(resolve(output, 'wiki/future/index.html')));
      for (const target of ['branch', 'future']) {
        const alias = `/wiki/old-${target}/`;
        assert.ok(!home.includes(alias) && !sitemap.includes(alias) && !search.includes(alias));
        const path = resolve(output, `wiki/old-${target}/index.html`);
        if (target === 'branch' || visible) {
          inspectRenderedRedirect(await readFile(path, 'utf8'), `https://docs.example.com/preview/wiki/${target}/`, `https://docs.example.com/preview${alias}`);
        } else await assert.rejects(access(path));
      }
    }
  } finally { await rm(root, { recursive: true, force: true }); }
});

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const adapter = fileURLToPath(new URL('./check-links.rb', import.meta.url));
const inspect = `
require 'html-proofer'
require 'json'
require ARGV[1] if ARGV[1]
runner = HTMLProofer.check_directory(ARGV[0], disable_external: true, allow_hash_href: true, log_level: :fatal)
runner.check_files
puts JSON.generate(runner.instance_variable_get(:@failures).map { |f| [f.path, f.check_name, f.description, f.line] }.sort)
`;
const failures = (root, cached) => JSON.parse(execFileSync('bundle', ['exec', 'ruby', '-e', inspect, root, ...(cached ? [adapter] : [])], { encoding: 'utf8' }));

test('fragment reuse preserves HTMLProofer file, URL, fragment and asset failures', () => {
  const root = mkdtempSync(join(tmpdir(), 'wn-link-check-'));
  const write = (name, content) => writeFileSync(join(root, name), content);
  try {
    mkdirSync(join(root, 'target'));
    write('target/index.html', `<h1 id="한글 앵커">Title</h1><a name="legacy" href="#legacy"></a><p id="Case">case</p><p id="a'b&amp;c">quoted</p>`);
    write('app.js', 'void 0;');
    write('image.svg', '<svg xmlns="http://www.w3.org/2000/svg"/>');
    write('index.html', `<a href="target/#%ED%95%9C%EA%B8%80%20%EC%95%B5%EC%BB%A4">encoded</a>
      <a href="target/#legacy">name</a><a href="target/#Case">case</a>
      <a href="target/#a'b&amp;c">quoted</a><a href="#">empty</a><a href="#top">top</a>
      <img src="image.svg" alt="diagram"><script src="app.js"></script>`);
    write('base.html', '<base href="/target/"><a href="#legacy">base</a>');
    write('redirect.html', '<meta http-equiv="refresh" content="0;url=target/"><a href="target/">continue</a>');
    const original = failures(root, false);
    assert.deepEqual(original, []);
    assert.deepEqual(failures(root, true), original);

    write('broken.html', `<a href="missing.html">missing file</a><a href="target/#missing">missing fragment</a>
      <a href="target/#case">case mismatch</a><a href="target/#없는값">missing unicode</a>
      <a href="target">missing slash</a><a href="//example.com">protocol relative</a>
      <img src="missing.svg" alt="missing"><img src="image.svg">
      <img srcset="image.svg 1x, absent.svg 2x" alt="srcset">
      <script src="missing.js"></script><script></script>`);
    write('base.html', '<base href="/target/"><a href="absent.html#legacy">missing relative to base</a>');
    write('redirect.html', '<meta http-equiv="refresh" content="0;url=target/"><a href="absent.html">broken fallback</a>');
    const broken = failures(root, false);
    assert.ok(broken.length >= 10, 'the baseline must detect the intended independent failures');
    assert.deepEqual(failures(root, true), broken);
    // A second invocation must read changed content, with no persistent cache.
    write('target/index.html', '<h1 id="replacement">Changed target</h1>');
    assert.deepEqual(failures(root, true), failures(root, false));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, rename, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import test from 'node:test';
import { classifyContentDiff, selectVerification } from './select-ci-verification.mjs';

const path = 'generated/public-content/example.md';
const environmentKey = 'e'.repeat(64);
const source = `---
layout: default
title: Example
nav_order: 1
permalink: /wiki/example/
publication_state: publish
projection_id: Wiki/example
projection_sha256: ${'a'.repeat(64)}
parent: Parent
content_status: ready
---

Original body.
`;
const git = (root, ...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
function commit(root) {
  git(root, 'add', '-A');
  git(root, '-c', 'user.name=CI Fixture', '-c', 'user.email=ci@example.invalid', 'commit', '-qm', 'fixture');
  return git(root, 'rev-parse', 'HEAD');
}
async function fixture(run, initial = source) {
  const root = await mkdtemp(resolve(tmpdir(), 'wn-ci-selection-'));
  try {
    git(root, 'init', '-q');
    await mkdir(resolve(root, 'generated/public-content'), { recursive: true });
    await writeFile(resolve(root, path), initial);
    const base = commit(root);
    await run({ root, base, file: resolve(root, path) });
  } finally { await rm(root, { recursive: true, force: true }); }
}

test('body and provenance edits to existing documents can reuse full verification', async () => {
  await fixture(async ({ root, base, file }) => {
    await writeFile(file, source.replace('Original body.', 'A revised example.').replace('a'.repeat(64), 'b'.repeat(64)));
    const result = classifyContentDiff(root, base, commit(root));
    assert.equal(result.contentOnly, true);
    assert.deepEqual(result.changedDocuments, [path]);
  });
});

test('navigation, presentation and publication metadata changes require full verification', async () => {
  for (const [before, after] of [['parent: Parent', 'parent: Other'], ['nav_order: 1', 'nav_order: 2'],
    ['title: Example', 'title: Renamed'], ['/wiki/example/', '/wiki/renamed/'],
    ['content_status: ready', 'content_status: planned'], ['publication_state: publish', 'publication_state: private']]) {
    await fixture(async ({ root, base, file }) => {
      await writeFile(file, source.replace(before, after));
      assert.equal(classifyContentDiff(root, base, commit(root)).contentOnly, false, before);
    });
  }
});

test('the existing strict parser rejects ambiguous metadata before selecting documents mode', async () => {
  for (const addition of ['title: Duplicate\n', 'search_terms: &terms [Example]\nparent: *terms\n']) {
    await fixture(async ({ root, base, file }) => {
      await writeFile(file, source.replace('layout: default\n', `layout: default\n${addition}`));
      assert.equal(classifyContentDiff(root, base, commit(root)).contentOnly, false);
    });
  }
});

test('document additions, deletions, moves and symlinks require full verification', async () => {
  for (const change of ['add', 'delete', 'move', 'symlink']) {
    await fixture(async ({ root, base, file }) => {
      if (change === 'add') await writeFile(resolve(root, 'generated/public-content/new.md'), source);
      if (change === 'delete') await rm(file);
      if (change === 'move') await rename(file, resolve(root, 'generated/public-content/moved.md'));
      if (change === 'symlink') { await rm(file); await symlink('other.md', file); }
      assert.equal(classifyContentDiff(root, base, commit(root)).contentOnly, false, change);
    });
  }
});

test('code, dependency, CI, test and noncompiler file changes require full verification', async () => {
  for (const other of ['assets/js/loader.js', 'package-lock.json', '.github/workflows/deploy.yml',
    'tests/browser/site.spec.ts', 'generated/public-content/README.md', 'generated/public-content/extra.html']) {
    await fixture(async ({ root, base }) => {
      await mkdir(resolve(root, other, '..'), { recursive: true });
      await writeFile(resolve(root, other), 'changed');
      assert.equal(classifyContentDiff(root, base, commit(root)).contentOnly, false, other);
    });
  }
});

test('browser fixture bodies require full verification but provenance alone does not', async () => {
  const initial = source.replace('/wiki/example/', '/wiki/platform-delivery-operations-topic-82e47b673856/');
  await fixture(async ({ root, base, file }) => {
    await writeFile(file, initial.replace('a'.repeat(64), 'b'.repeat(64)));
    assert.equal(classifyContentDiff(root, base, commit(root)).contentOnly, true);
    await writeFile(file, initial.replace('Original body.', 'Changed source used by the browser contract.'));
    assert.equal(classifyContentDiff(root, base, commit(root)).contentOnly, false);
  }, initial);
});

test('missing and nonancestor comparison revisions require full verification', async () => {
  await fixture(async ({ root, base, file }) => {
    await writeFile(file, source.replace('Original body.', 'New body.'));
    const head = commit(root);
    assert.equal(classifyContentDiff(root, undefined, head).contentOnly, false);
    assert.equal(classifyContentDiff(root, '0'.repeat(40), head).contentOnly, false);
    assert.equal(classifyContentDiff(root, head, base).contentOnly, false);
  });
});

async function eligible(run) {
  await fixture(async ({ root, base, file }) => {
    await writeFile(file, source.replace('Original body.', 'Revised body.'));
    const head = commit(root);
    const options = { root, head, eventName: 'push', event: { before: base }, runAttempt: 1, environmentKey };
    const fullRun = { id: 10, head_sha: base, head_branch: 'main', event: 'push', conclusion: 'success', run_started_at: '2026-09-09T00:00:00Z' };
    const jobs = [{ name: 'build', steps: [{ name: `Verify full production build [${environmentKey}]`, conclusion: 'success' }] }];
    await run({ options, fullRun, jobs });
  });
}

test('a successful full ancestor with identical inputs and environment permits documents mode', async () => {
  await eligible(async ({ options, fullRun, jobs }) => {
    const request = async route => route.includes('/jobs?') ? { jobs } : { workflow_runs: [fullRun] };
    const result = await selectVerification({ ...options, request });
    assert.equal(result.mode, 'documents');
    assert.equal(result.evidenceRun, 10);
    assert.equal(result.evidenceSha, options.event.before);
    assert.deepEqual(result.changedDocuments, [path]);
    assert.equal((await selectVerification({ ...options, eventName: 'pull_request', event: { pull_request: { base: { sha: options.event.before } } }, request })).mode, 'documents');
  });
});

test('manual runs, reruns and unknown context never reuse previous verification', async () => {
  await eligible(async ({ options }) => {
    for (const change of [{ eventName: 'workflow_dispatch' }, { runAttempt: 2 }, { event: {} }, { environmentKey: null }]) {
      let requested = false;
      const result = await selectVerification({ ...options, ...change, request: async () => { requested = true; throw new Error('must not request'); } });
      assert.equal(result.mode, 'full');
      assert.equal(requested, false);
    }
  });
});

test('a skipped browser job, different environment or absent/API-failed evidence requires full verification', async () => {
  await eligible(async ({ options, fullRun }) => {
    for (const steps of [[], [{ name: `Verify full production build [${environmentKey}]`, conclusion: 'skipped' }],
      [{ name: `Verify full production build [${'f'.repeat(64)}]`, conclusion: 'success' }]]) {
      const request = async route => route.includes('/jobs?') ? { jobs: [{ name: 'build', steps }] } : { workflow_runs: [fullRun] };
      assert.equal((await selectVerification({ ...options, request })).mode, 'full');
    }
    assert.equal((await selectVerification({ ...options, request: async () => ({ workflow_runs: [] }) })).mode, 'full');
    assert.equal((await selectVerification({ ...options, request: async () => { throw new Error('403'); } })).mode, 'full');
  });
});

test('a full success before a runtime change cannot validate later document edits', async () => {
  await fixture(async ({ root, base, file }) => {
    await writeFile(resolve(root, 'runtime.js'), 'changed runtime');
    const before = commit(root);
    await writeFile(file, source.replace('Original body.', 'New body.'));
    const head = commit(root);
    const request = async route => {
      if (route.includes('/jobs?')) return { jobs: [{ name: 'build', steps: [
        { name: `Verify full production build [${environmentKey}]`, conclusion: 'success' },
      ] }] };
      return { workflow_runs: [{ id: 10, head_sha: base, head_branch: 'main', event: 'push', conclusion: 'success', run_started_at: '2026-09-09T00:00:00Z' }] };
    };
    const result = await selectVerification({ root, head, eventName: 'push', event: { before }, runAttempt: 1, environmentKey, request });
    assert.equal(result.mode, 'full');
  });
});

test('a newer failed full check cannot be hidden by an older successful run', async () => {
  await eligible(async ({ options, fullRun, jobs }) => {
    const failure = { ...fullRun, id: 11, conclusion: 'failure', run_started_at: '2026-09-09T01:00:00Z' };
    const request = async route => route.includes('/11/jobs?')
      ? { jobs: [{ name: 'build', steps: [{ ...jobs[0].steps[0], conclusion: 'failure' }] }] }
      : route.includes('/jobs?') ? { jobs } : { workflow_runs: [fullRun, failure] };
    assert.match((await selectVerification({ ...options, request })).reason, /latest matching full verification did not succeed/u);
  });
});

test('a successful content-only run is not mistaken for a full verification', async () => {
  await eligible(async ({ options, fullRun, jobs }) => {
    const publication = { ...fullRun, id: 11, run_started_at: '2026-09-09T01:00:00Z' };
    const request = async route => route.includes('/11/jobs?')
      ? { jobs: [{ name: 'build', steps: [{ ...jobs[0].steps[0], conclusion: 'skipped' }] }] }
      : route.includes('/jobs?') ? { jobs } : { workflow_runs: [publication, fullRun] };
    const result = await selectVerification({ ...options, request });
    assert.equal(result.mode, 'documents');
    assert.equal(result.evidenceRun, 10);
  });
});

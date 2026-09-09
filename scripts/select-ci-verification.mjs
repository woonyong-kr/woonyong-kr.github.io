import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { appendFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import browserPages from '../tests/fixtures/browser-pages.json' with { type: 'json' };
import { frontMatter } from './site-policy.mjs';

const SHA = /^[a-f0-9]{40}$/u;
const FULL_STEP = 'Verify full production build';
const git = (root, ...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const body = source => source.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/u, '');

// Only existing, regular compiler documents with unchanged presentation metadata qualify.
export function classifyContentDiff(root, base, head) {
  const full = reason => ({ contentOnly: false, reason, changedDocuments: [] });
  if (!SHA.test(base ?? '') || !SHA.test(head ?? '')) return full('Missing or invalid comparison revision');
  if (!Object.values(browserPages).every(path => typeof path === 'string' && /^\/wiki\/[a-z0-9-]+\/$/u.test(path))) {
    return full('Browser fixture inputs are not identifiable');
  }
  try {
    git(root, 'merge-base', '--is-ancestor', base, head);
    const entries = git(root, 'diff', '--raw', '--no-abbrev', '--no-renames', '-z', base, head).split('\0');
    const changedDocuments = [];
    for (let i = 0; i < entries.length - 1; i += 2) {
      const [oldMode, newMode, , , status] = entries[i].split(' ');
      const path = entries[i + 1];
      if (status !== 'M' || oldMode !== ':100644' || newMode !== '100644' ||
          !/^generated\/public-content\/[a-z0-9]+(?:-[a-z0-9]+)*\.md$/u.test(path)) {
        return full('A file was added, removed, moved, changed type, or changed outside compiler documents');
      }
      const before = git(root, 'show', `${base}:${path}`);
      const after = git(root, 'show', `${head}:${path}`);
      const beforeMetadata = frontMatter(before, path);
      const afterMetadata = frontMatter(after, path);
      delete beforeMetadata.projection_sha256;
      delete afterMetadata.projection_sha256;
      if (!isDeepStrictEqual(beforeMetadata, afterMetadata)) return full(`Presentation or navigation metadata changed: ${path}`);
      if (Object.values(browserPages).includes(beforeMetadata.permalink) && body(before) !== body(after)) {
        return full(`A browser contract fixture changed: ${path}`);
      }
      changedDocuments.push(path);
    }
    return { contentOnly: true, reason: 'Only existing document bodies or provenance changed', changedDocuments };
  } catch {
    return full('History or document metadata could not be compared safely');
  }
}

export async function selectVerification({ root, eventName, event, head, runAttempt, environmentKey, request }) {
  const full = reason => ({ mode: 'full', reason });
  if (!['push', 'pull_request'].includes(eventName) || runAttempt !== 1) return full('Manual, repeated, or unsupported workflow event');
  if (!/^[a-f0-9]{64}$/u.test(environmentKey ?? '')) return full('The verification environment is not identifiable');
  const base = eventName === 'push' ? event.before : event.pull_request?.base?.sha;
  const comparison = classifyContentDiff(root, base, head);
  if (!comparison.contentOnly) return full(comparison.reason);
  if (!comparison.changedDocuments.length) return full('No changed documents to classify');
  try {
    const { workflow_runs: runs } = await request('actions/workflows/deploy.yml/runs?branch=main&status=completed&per_page=100');
    if (!Array.isArray(runs)) throw new Error('Missing workflow runs');
    if (runs.some(run => !Number.isFinite(Date.parse(run.run_started_at ?? run.created_at)))) throw new Error('Run ordering is unavailable');
    runs.sort((a, b) => Date.parse(b.run_started_at ?? b.created_at) - Date.parse(a.run_started_at ?? a.created_at));
    for (const run of runs) {
      if (run.head_branch !== 'main' || !['push', 'workflow_dispatch'].includes(run.event) || !Number.isSafeInteger(run.id)) continue;
      const { jobs } = await request(`actions/runs/${run.id}/jobs?filter=latest&per_page=100`);
      const build = jobs?.find(job => job.name === 'build');
      if (!Array.isArray(build?.steps)) throw new Error('Missing build steps');
      const verified = build.steps.find(step => step.name === `${FULL_STEP} [${environmentKey}]`);
      if (!verified || verified.conclusion === 'skipped') continue;
      if (!classifyContentDiff(root, run.head_sha, head).contentOnly) continue;
      // A newer failed full check must not be hidden by an older success.
      if (run.conclusion !== 'success' || verified.conclusion !== 'success') return full('The latest matching full verification did not succeed');
      return { mode: 'documents', reason: comparison.reason, comparisonBase: base,
        changedDocuments: comparison.changedDocuments, evidenceRun: run.id, evidenceSha: run.head_sha };
    }
    return full('No matching successful full verification was found in the latest 100 completed main runs');
  } catch {
    return full('Successful full verification evidence could not be confirmed');
  }
}

function verificationEnvironment() {
  if (!process.env.ImageOS || !process.env.ImageVersion) return { key: null, description: 'Runner image version unavailable' };
  const versions = { image: `${process.env.ImageOS}/${process.env.ImageVersion}`, platform: process.platform,
    architecture: process.arch, node: process.version, npm: execFileSync('npm', ['--version'], { encoding: 'utf8' }).trim(),
    ruby: execFileSync('ruby', ['--version'], { encoding: 'utf8' }).trim(),
    bundler: execFileSync('bundle', ['--version'], { encoding: 'utf8' }).trim() };
  return { key: createHash('sha256').update(JSON.stringify(versions)).digest('hex'), description: JSON.stringify(versions) };
}

async function main() {
  let result = { mode: 'full', reason: 'CI comparison context unavailable' };
  let environment = { key: null, description: 'Unavailable' };
  try {
    environment = verificationEnvironment();
    const event = JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, 'utf8'));
    const signal = AbortSignal.timeout(30_000);
    const request = async path => {
      if (!process.env.GITHUB_TOKEN || !process.env.GITHUB_REPOSITORY) throw new Error('Missing Actions read access');
      const response = await fetch(`${process.env.GITHUB_API_URL}/repos/${process.env.GITHUB_REPOSITORY}/${path}`, {
        headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          'X-GitHub-Api-Version': '2026-03-10' }, signal,
      });
      if (!response.ok) throw new Error(`Actions API ${response.status}`);
      return response.json();
    };
    result = await selectVerification({ root: process.cwd(), eventName: process.env.GITHUB_EVENT_NAME, event,
      head: git(process.cwd(), 'rev-parse', 'HEAD').trim(), runAttempt: Number(process.env.GITHUB_RUN_ATTEMPT),
      environmentKey: environment.key, request });
  } catch { result = { mode: 'full', reason: 'CI comparison context or environment unavailable' }; }
  console.log(JSON.stringify({ ...result, environment: environment.description }, null, 2));
  if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT,
    `mode=${result.mode}\nenvironment=${environment.key ?? 'unavailable'}\n`);
  if (process.env.GITHUB_STEP_SUMMARY) {
    const evidence = result.evidenceRun
      ? `Reused full verification: [run ${result.evidenceRun}](${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${result.evidenceRun}) at \`${result.evidenceSha}\`.\n`
      : 'No prior full verification is being reused.\n';
    await appendFile(process.env.GITHUB_STEP_SUMMARY, `### Verification: ${result.mode}\n\n${result.reason}\n\n${evidence}\n` +
      `Command: \`npm run ${result.mode === 'full' ? 'verify' : 'verify:publication'}\`.\n\nEnvironment: \`${environment.description}\`\n\n` +
      'Changed documents and new runnable examples still require live acceptance after deployment.\n');
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) await main();

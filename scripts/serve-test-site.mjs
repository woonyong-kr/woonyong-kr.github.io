import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const root = resolve(import.meta.dirname, '../_site');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
const server = createServer(async (request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  // Deterministic runner fixture. Never forwards code to a real service.
  if (pathname.startsWith('/v1/')) {
    response.setHeader('Content-Type', 'application/json');
    const fault = request.headers['x-test-response'];
    if (fault === 'headers') return;
    if (fault === 'body') { response.writeHead(200); response.write('{'); return; }
    if (fault === 'truncated') { response.end('{'); return; }
    if (fault === 'rate-limit') { response.writeHead(429, { 'Retry-After': '1' }); response.end('{"error":"busy"}'); return; }
    if (pathname.endsWith('capabilities')) {
      response.end(JSON.stringify({ languages: ['java', 'kotlin'], protocolVersion: 1, runnerVersion: 'fixture', service: 'personal-compiler', status: 'online' }));
      return;
    }
    let body = '';
    for await (const chunk of request) body += chunk;
    const value = JSON.parse(body);
    response.end(JSON.stringify({ durationMs: 2, exitCode: 0, language: value.language, provider: 'fixture', stderr: '', stdout: 'server-ok' }));
    return;
  }
  let path = resolve(root, `.${decodeURIComponent(pathname)}`);
  try {
    if (path !== root && !path.startsWith(root + sep)) throw new Error('outside root');
    if ((await stat(path)).isDirectory()) path = resolve(path, 'index.html');
    const body = await readFile(path);
    response.writeHead(200, { 'Content-Type': types[extname(path)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
    response.end(body);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    response.end(await readFile(resolve(root, '404.html')));
  }
});
server.listen(4177, '127.0.0.1', () => console.log('Built site: http://127.0.0.1:4177'));

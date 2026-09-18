// Optional local preview only. The deployed app is entirely static.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = Number(process.env.PORT || 4173);
const prefix = '/kaisereich-run-picker/';
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml' };
createServer(async (request, response) => {
  try {
    let path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (path === prefix.slice(0, -1)) { response.writeHead(302, { Location: prefix }); response.end(); return; }
    if (path.startsWith(prefix)) path = path.slice(prefix.length);
    const file = resolve(root, path.replace(/^\/+/, '') || 'index.html');
    if (!file.startsWith(root.endsWith(sep) ? root : root + sep) || /(^|[\\/])\./.test(path)) {
      response.writeHead(403); response.end('Forbidden'); return;
    }
    const body = await readFile(file);
    response.writeHead(200, { 'Content-Type': `${types[extname(file)] || 'text/plain'}; charset=utf-8`, 'Cache-Control': 'no-store' });
    response.end(body);
  } catch { response.writeHead(404); response.end('Not found'); }
}).listen(port, '127.0.0.1', () => console.log(`Preview: http://127.0.0.1:${port}${prefix}`));

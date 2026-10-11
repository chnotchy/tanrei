// A tiny stand-in for `tanrei studio` (packages/cli/src/studio-server.js): the same HTTP contract over one layer
// file, for the adapter tests and for developing the standalone app. Optionally serves a static directory.
//
//   node test/mock-server.mjs --file /tmp/acme.system.json [--app dist-app] [--port 4400] [--token dev]
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const etagOf = (text) => `"${crypto.createHash('sha256').update(text).digest('hex').slice(0, 32)}"`;

/**
 * @param {{ file: string, appDir?: string, port?: number, token?: string, validate?: (layer: object) => string[], build?: (file: string) => Promise<object>, announce?: boolean }} options
 *   `announce: false` — say nothing over the event stream (a test that needs the 409 of a save, not the announcement that would come first)
 */
export async function startMockServer({ file, appDir, port = 0, token = crypto.randomBytes(12).toString('hex'), validate = () => [], build, announce = true }) {
  const listeners = new Set();
  const read = () => fs.readFileSync(file, 'utf8');
  let lastSeen = etagOf(read());
  const notify = () => {
    let current;
    try {
      current = etagOf(read());
    } catch {
      return;
    }
    if (current === lastSeen) return;
    lastSeen = current;
    if (!announce) return;
    for (const res of listeners) res.write(`event: layer\ndata: ${JSON.stringify({ etag: current })}\n\n`);
  };
  // The layers next to the file: what it may extend (the CLI reads them as regular files only; a mock need not care).
  const parents = () =>
    fs.readdirSync(path.dirname(file)).filter((name) => name.endsWith('.system.json') && name !== path.basename(file)).sort().flatMap((name) => {
      try {
        const layer = JSON.parse(fs.readFileSync(path.join(path.dirname(file), name), 'utf8'));
        return layer?.id === name.replace('.system.json', '') ? [{ id: layer.id, layer }] : [];
      } catch {
        return [];
      }
    });
  let parentsSeen = JSON.stringify(parents());
  const notifyParents = () => {
    const current = JSON.stringify(parents());
    if (current === parentsSeen) return;
    parentsSeen = current;
    for (const res of listeners) res.write('event: parents\ndata: {}\n\n');
  };
  const watcher = fs.watch(path.dirname(file), (_event, name) => (!name || name === path.basename(file) ? notify() : notifyParents()));
  const poll = setInterval(() => (notify(), notifyParents()), 250); // fs.watch is best-effort on some filesystems
  const tickets = new Set(); // single use; the CLI also expires them
  let building = false;

  const json = (res, status, body) => res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' }).end(JSON.stringify(body));
  const bodyOf = (req) => new Promise((resolve) => { let text = ''; req.on('data', (chunk) => (text += chunk)).on('end', () => resolve(text)); });

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (!url.pathname.startsWith('/api/')) {
      if (!appDir) return json(res, 404, { problems: ['no app'] });
      const target = path.join(appDir, path.normalize(url.pathname).replace(/^\/+/, '') || 'index.html');
      const found = target.startsWith(appDir) && fs.existsSync(target) && fs.statSync(target).isFile() ? target : path.join(appDir, 'index.html');
      // The CLI's policy: the app must run without eval and talk to this origin only.
      return res.writeHead(200, { 'content-type': MIME[path.extname(found)] ?? 'application/octet-stream', 'content-security-policy': "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'" }).end(fs.readFileSync(found));
    }
    const route = `${req.method} ${url.pathname}`;
    // The event stream is opened with a single-use ticket; everything else needs the token, in a header only.
    if (route === 'GET /api/events') {
      if (!tickets.delete(url.searchParams.get('ticket') ?? '')) return json(res, 401, { problems: ['missing, used or expired ticket'] });
      res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store', connection: 'keep-alive' });
      res.write(': connected\n\n');
      listeners.add(res);
      res.on('close', () => listeners.delete(res)); // the RESPONSE closing is the connection going away
      return undefined;
    }
    if (req.headers['x-tanrei-token'] !== token) return json(res, 401, { problems: ['missing or wrong token'] });
    if (route === 'POST /api/events/ticket') {
      const ticket = crypto.randomBytes(12).toString('hex');
      tickets.add(ticket);
      return json(res, 200, { ticket });
    }
    if (route === 'GET /api/parents') return json(res, 200, parents());
    if (route === 'GET /api/session') {
      const layer = JSON.parse(read());
      return json(res, 200, { id: layer.id, file: path.basename(file), extends: layer.extends ?? null, targets: ['web', 'tokens'] });
    }
    if (route === 'GET /api/layer') return json(res, 200, { layer: JSON.parse(read()), etag: etagOf(read()) });
    if (route === 'PUT /api/layer') {
      const { layer } = JSON.parse(await bodyOf(req));
      const current = read();
      if (req.headers['if-match'] !== etagOf(current)) return json(res, 409, { layer: JSON.parse(current), etag: etagOf(current) });
      const problems = [...(layer?.id !== JSON.parse(current).id ? ['"id" must stay equal to the file name; rename the file to rename the system'] : []), ...validate(layer ?? {})];
      if (problems.length) return json(res, 422, { problems });
      const text = `${JSON.stringify(layer, null, 2)}\n`;
      lastSeen = etagOf(text);
      fs.writeFileSync(file, text);
      return json(res, 200, { etag: lastSeen });
    }
    if (route === 'POST /api/build') {
      if (building) return json(res, 429, { problems: ['a build is already running — try again when it has finished'] });
      building = true;
      try {
        const result = build ? await build(file) : { id: JSON.parse(read()).id, chain: [], tokens: 0, warnings: [], files: {} };
        const files = Object.entries(result.files).flatMap(([target, entries]) => Object.keys(entries).map((name) => ({ target, path: `${target}/${name}`, changed: url.searchParams.has('dry') ? null : true })));
        return json(res, 200, { id: result.id, chain: result.chain, tokens: result.tokens, warnings: result.warnings, files });
      } catch (error) {
        return json(res, 422, { problems: [error.message] });
      } finally {
        building = false;
      }
    }
    return json(res, 404, { problems: [`no such endpoint: ${route}`] });
  });
  await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  return {
    origin,
    token,
    url: `${origin}/#token=${token}`,
    close: () => new Promise((resolve) => { clearInterval(poll); watcher.close(); for (const res of listeners) res.end(); server.close(resolve); server.closeAllConnections?.(); }),
  };
}

// CLI use, for developing the app against a real file. (`node --test` also runs this file, without `--file`: nothing to do.)
if (process.argv[1] === fileURLToPath(import.meta.url) && process.argv.includes('--file')) {
  const arg = (name, fallback) => (process.argv.includes(`--${name}`) ? process.argv[process.argv.indexOf(`--${name}`) + 1] : fallback);
  const file = path.resolve(arg('file', 'acme.system.json'));
  if (!fs.existsSync(file)) fs.writeFileSync(file, `${JSON.stringify({ id: path.basename(file, '.system.json'), extends: 'tanrei' }, null, 2)}\n`);
  const { buildProductSystem } = await import('@tanrei/tokens-build/product');
  const server = await startMockServer({ file, appDir: arg('app') && path.resolve(arg('app')), port: Number(arg('port', 0)), token: arg('token'), build: (layerFile) => buildProductSystem({ layerFile, targets: ['web', 'tokens'] }) });
  console.log(server.url);
}

// `tanrei studio` — serves Theme Studio locally and lets it edit THIS product's layer file.
//
// The GUI, the JSON file and `tanrei build` are three views of one thing: whoever prefers sliders, a tree of
// every token, or a text editor changes the same <id>.system.json.
//
// A local server that writes files deserves care:
//   · it binds to 127.0.0.1 only, on a random free port unless told otherwise;
//   · every /api request must carry a random per-run token in a HEADER (the browser gets it in the URL FRAGMENT,
//     which is never sent over the network or logged, and the app removes it from the address bar at once), so
//     another page in the same browser cannot drive it. The token is never accepted in a URL;
//   · the event stream — the one request a browser's EventSource cannot give a header — is opened with a
//     ticket instead: asked for with the token, good for one connection and for half a minute;
//   · Host and Origin must be this server's — that defeats DNS rebinding;
//   · the layer path is fixed at start-up: no request can name a file;
//   · the layers next to it (a product may stack its own) are read as regular files only — never through a
//     symbolic link, never by a name a request supplies — and everything is validated and built in memory:
//     nothing is copied anywhere, there is no temp directory;
//   · one build at a time; a second one is told to come back (429);
//   · a save is refused unless the ENGINE accepts the layer (what `tanrei build` would refuse is never written);
//     that costs a resolve, so saves take turns — one at a time, a short line behind it, 429 beyond that;
//   · writes are atomic (temp file + rename) and conditional (If-Match), so an edit made in an editor at the
//     same time is never silently overwritten.
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { listSystems } from '@tanrei/tokens-build/bundle';
import { REPO_ROOT } from '@tanrei/tokens-build/model';
import { LAYER_SUFFIX, LayerProblems, buildProductSystem, chainDigest, readSystemChain, resolveSystem, systemIdOf } from '@tanrei/tokens-build/product';

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png', '.ico': 'image/x-icon', '.map': 'application/json' };
const MAX_BODY = 5 * 1024 * 1024;
const LAYER_ID = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/; // tokens/schema/system.schema.json: the only ids that become file names
const TICKET_TTL_MS = 30_000;
const MAX_TICKETS = 32;
const MAX_PARENTS = 64;
const MAX_WAITING_SAVES = 4; // one Studio sends one save at a time; a line longer than this is not a Studio
const ACCEPTED_MEMORY = 32; // chains the engine accepted in this run, by digest: A → B → A does not resolve A twice

const etagOf = (text) => `"${crypto.createHash('sha256').update(text).digest('hex').slice(0, 32)}"`;
/** Two-space JSON with a trailing newline: what `tanrei init` writes and what people expect in a diff. */
export const stringifyLayer = (layer) => `${JSON.stringify(layer, null, 2)}\n`;

function writeAtomically(file, text) {
  const tmp = path.join(path.dirname(file), `.${path.basename(file)}.${process.pid}.${crypto.randomBytes(8).toString('hex')}.tmp`);
  // `wx`: never write through something that is already there; the file keeps the permissions it had.
  let mode = 0o644;
  try { mode = fs.statSync(file).mode & 0o777; } catch {}
  fs.writeFileSync(tmp, text, { flag: 'wx', mode });
  try {
    fs.renameSync(tmp, file);
  } catch (error) {
    fs.rmSync(tmp, { force: true });
    throw error;
  }
}

/**
 * One regular file, read without following a symbolic link: the link is refused where the platform can refuse it
 * (O_NOFOLLOW), and everywhere the file that was opened must be the one that was looked at (same device and inode),
 * so swapping a link in between the two steps gains nothing.
 * @returns {{ text: string } | { why: string }}
 */
export function readRegularFile(full, maxBytes = MAX_BODY) {
  let fd;
  try {
    const seen = fs.lstatSync(full);
    if (seen.isSymbolicLink()) return { why: 'is a symbolic link' };
    if (!seen.isFile()) return { why: 'is not a regular file' };
    fd = fs.openSync(full, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
    const opened = fs.fstatSync(fd);
    if (!opened.isFile() || opened.ino !== seen.ino || opened.dev !== seen.dev) return { why: 'changed while it was being read' };
    if (opened.size > maxBytes) return { why: `is larger than ${maxBytes} bytes` };
    return { text: fs.readFileSync(fd, 'utf8') };
  } catch (error) {
    return { why: error.code === 'ELOOP' ? 'is a symbolic link' : `cannot be read (${error.code ?? error.message})` };
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
}

/**
 * The layers next to the edited file: what it may `extends` besides the shipped systems. Read-only, regular files
 * only, named `<id>.system.json` with a legal id that the file itself states.
 * @returns {{ parents: { id: string, layer: object }[], skipped: Record<string, string> }} `skipped[id]` = why not
 */
export function readSiblingLayers(file, shipped = new Set(listSystems(REPO_ROOT))) {
  const dir = path.dirname(file);
  const parents = [];
  const skipped = {};
  for (const name of fs.readdirSync(dir).sort()) {
    if (!name.endsWith(LAYER_SUFFIX) || name === path.basename(file)) continue;
    const id = systemIdOf(name);
    if (!LAYER_ID.test(id)) continue;
    if (shipped.has(id)) { skipped[id] = 'has the id of a system that ships with Tanrei'; continue; }
    if (parents.length >= MAX_PARENTS) { skipped[id] = `is beyond the ${MAX_PARENTS} layers Theme Studio reads from one directory`; continue; }
    const read = readRegularFile(path.join(dir, name));
    if ('why' in read) { skipped[id] = read.why; continue; }
    try {
      const layer = JSON.parse(read.text);
      if (!layer || typeof layer !== 'object' || Array.isArray(layer) || layer.id !== id) skipped[id] = '"id" does not equal the file name';
      else parents.push({ id, layer });
    } catch {
      skipped[id] = 'is not JSON';
    }
  }
  return { parents, skipped };
}

/**
 * @param {{ layerFile: string, outputs?: Record<string,string>, kotlinPackage?: string, base?: string, appDir: string, port?: number,
 *           writeOutputs?: (result: object) => { target: string, path: string, changed: boolean }[],
 *           ticketTtlMs?: number, buildSystem?: typeof buildProductSystem, resolveLayers?: (layers: object[]) => Promise<unknown> }} options
 *           the last three exist for tests. `resolveLayers` is the save's question to the engine: it resolves when the
 *           chain is valid AND the engine builds it, and throws what the engine throws (`LayerProblems` lists everything).
 * @returns {Promise<{ url: string, port: number, token: string, close: () => Promise<void> }>}
 */
export async function startStudioServer({ layerFile, outputs = {}, kotlinPackage, appDir, port = 0, writeOutputs, ticketTtlMs = TICKET_TTL_MS, buildSystem = buildProductSystem, resolveLayers = (layers) => resolveSystem({ layers }, { model: false }) }) {
  const file = path.resolve(layerFile);
  const root = path.resolve(appDir);
  if (!fs.existsSync(file)) throw new Error(`${layerFile} does not exist. Run \`tanrei init <id>\` first.`);
  if (!fs.existsSync(path.join(root, 'index.html'))) throw new Error(`Theme Studio is not bundled in this build of the CLI (${appDir}). Reinstall @tanrei/cli, or inside the Tanrei repository run: pnpm --filter @tanrei/studio build:app`);
  const token = crypto.randomBytes(24).toString('base64url');
  const read = () => fs.readFileSync(file, 'utf8');
  const listeners = new Set();
  const tickets = new Map(); // ticket → expiry (ms): single use, short-lived
  const shipped = new Set(listSystems(REPO_ROOT));
  const safeEqual = (a, b) => typeof a === 'string' && a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

  /**
   * The chain the engine gets: the local layers as OBJECTS (read safely above) and no directory, so the pipeline
   * itself reads nothing from the product's disk — parents come from these objects, then from the shipped systems.
   */
  const chainInput = (layer) => {
    const { parents, skipped } = readSiblingLayers(file, shipped);
    return { layers: [...parents.map((parent) => parent.layer), layer], skipped };
  };
  /** A parent that was refused is a better answer than "not found". */
  const explain = (error, skipped) => {
    const wanted = /^system "([^"]+)" not found/.exec(error.message)?.[1];
    return wanted && skipped[wanted] ? `"extends": "${wanted}" — ${wanted}${LAYER_SUFFIX} ${skipped[wanted]}; Theme Studio reads only regular layer files next to ${path.basename(file)}` : error.message;
  };

  // Tell open Studios when the file changes underneath them (an editor, git checkout, a colleague's pull).
  let lastSeen = etagOf(read());
  let parentsTimer;
  const watcher = fs.watch(path.dirname(file), (_event, name) => {
    if (name && name !== path.basename(file)) {
      // A layer next to ours changed: what ours inherits may have. Open Studios fetch the parents again.
      if (!String(name).endsWith(LAYER_SUFFIX)) return;
      clearTimeout(parentsTimer);
      parentsTimer = setTimeout(() => { for (const res of listeners) res.write('event: parents\ndata: {}\n\n'); }, 50);
      return;
    }
    let current;
    try { current = etagOf(read()); } catch { return; } // mid-rename
    if (current === lastSeen) return;
    lastSeen = current;
    for (const res of listeners) res.write(`event: layer\ndata: ${JSON.stringify({ etag: current })}\n\n`);
  });

  const json = (res, status, body, headers = {}) => {
    res.writeHead(status, { 'content-type': MIME['.json'], 'cache-control': 'no-store', ...headers });
    res.end(JSON.stringify(body));
  };
  const body = (req) =>
    new Promise((resolve, reject) => {
      let size = 0;
      const chunks = [];
      req.on('data', (chunk) => {
        size += chunk.length;
        if (size > MAX_BODY) reject(Object.assign(new Error('request body too large'), { status: 413 }));
        else chunks.push(chunk);
      });
      req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      req.on('error', reject);
    });

  let origin = '';
  let building = false;
  const targets = Object.keys(outputs);
  const openStream = (req, res) => {
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store', connection: 'keep-alive' });
    res.write(': connected\n\n');
    listeners.add(res);
    res.on('close', () => listeners.delete(res)); // the RESPONSE closing is the connection going away
  };
  let lastSave = Promise.resolve();
  let waitingSaves = 0;
  const accepted = new Set();
  async function save(req, res, layer) {
    const current = read();
    if (req.headers['if-match'] !== etagOf(current)) return json(res, 409, { layer: JSON.parse(current), etag: etagOf(current) });
    if (!layer || typeof layer !== 'object' || layer.id !== JSON.parse(current).id) return json(res, 422, { problems: ['"id" must stay equal to the file name; rename the file to rename the system'] });
    // Validate what WOULD be written, with the local layers it may extend — in memory (tokens-build/resolve.js):
    // the schema and the chain rules, then the engine itself, so that what is written is what `tanrei build` builds.
    // The engine's answer is given word for word.
    const { layers, skipped } = chainInput(layer);
    try {
      const digest = chainDigest(readSystemChain({ layers }).chain);
      if (!accepted.has(digest)) {
        await resolveLayers(layers);
        accepted.add(digest);
        if (accepted.size > ACCEPTED_MEMORY) accepted.delete(accepted.values().next().value);
      }
    } catch (error) {
      return json(res, 422, { problems: error instanceof LayerProblems ? error.problems : [explain(error, skipped)] });
    }
    // Asking the engine took a moment: the file is looked at again before it is replaced.
    const now = read();
    if (now !== current) return json(res, 409, { layer: JSON.parse(now), etag: etagOf(now) });
    const text = stringifyLayer(layer);
    lastSeen = etagOf(text); // our own write is not an "external change"
    writeAtomically(file, text);
    return json(res, 200, { etag: lastSeen }, { etag: lastSeen });
  }

  async function api(req, res, url) {
    // The event stream is opened with a ticket (below), because an EventSource cannot send a header. It is the
    // only request that is let in without the token, and a ticket opens exactly one stream, once, soon.
    if (url.pathname === '/api/events' && req.method === 'GET') {
      const ticket = url.searchParams.get('ticket') ?? '';
      const expiry = tickets.get(ticket); // 192 random bits, one use, half a minute: nothing to learn from timing
      tickets.delete(ticket);
      if (!expiry || expiry < Date.now()) return json(res, 401, { problems: ['missing, used or expired ticket — ask POST /api/events/ticket for a new one'] });
      return openStream(req, res);
    }
    // The token travels in a header only: a URL ends up in logs, history and Referer.
    if (!safeEqual(req.headers['x-tanrei-token'], token)) return json(res, 401, { problems: ['missing or wrong token — open the URL that `tanrei studio` printed'] });

    if (url.pathname === '/api/events/ticket' && req.method === 'POST') {
      const now = Date.now();
      for (const [known, expiry] of tickets) if (expiry < now) tickets.delete(known);
      if (tickets.size >= MAX_TICKETS) return json(res, 429, { problems: ['too many unused tickets; use one or wait half a minute'] }, { 'retry-after': '30' });
      const ticket = crypto.randomBytes(24).toString('base64url');
      tickets.set(ticket, now + ticketTtlMs);
      return json(res, 200, { ticket, expiresInMs: ticketTtlMs });
    }
    if (url.pathname === '/api/parents' && req.method === 'GET') return json(res, 200, readSiblingLayers(file, shipped).parents);

    if (url.pathname === '/api/session' && req.method === 'GET') {
      const layer = JSON.parse(read());
      return json(res, 200, { id: layer.id, file: path.relative(process.cwd(), file) || path.basename(file), extends: layer.extends ?? null, targets });
    }
    if (url.pathname === '/api/layer' && req.method === 'GET') {
      const text = read();
      return json(res, 200, { layer: JSON.parse(text), etag: etagOf(text) }, { etag: etagOf(text) });
    }
    if (url.pathname === '/api/layer' && req.method === 'PUT') {
      const { layer } = JSON.parse(await body(req));
      if (waitingSaves >= MAX_WAITING_SAVES) return json(res, 429, { problems: ['too many saves are waiting — try again in a moment'] }, { 'retry-after': '1' });
      // Saves take turns: the engine is asked about one layer at a time, and no save decides on a file another is about to replace.
      waitingSaves += 1;
      const before = lastSave;
      let done;
      lastSave = new Promise((resolve) => (done = resolve));
      await before;
      try {
        return await save(req, res, layer);
      } finally {
        waitingSaves -= 1;
        done();
      }
    }
    if (url.pathname === '/api/build' && req.method === 'POST') {
      // A build is the one expensive request: one at a time, and nobody queues behind it.
      if (building) return json(res, 429, { problems: ['a build is already running — try again when it has finished'] }, { 'retry-after': '1' });
      building = true;
      let skipped = {};
      try {
        const dry = url.searchParams.has('dry');
        const layer = JSON.parse(read());
        if (!layer || typeof layer !== 'object' || layer.id !== systemIdOf(file)) throw new Error(`${path.basename(file)}: "id" must equal the file name`);
        const input = chainInput(layer);
        skipped = input.skipped;
        const result = await buildSystem({ layers: input.layers, targets: targets.length ? targets : ['web'], kotlinPackage });
        const files = dry || !writeOutputs
          ? Object.entries(result.files).flatMap(([target, entries]) => Object.keys(entries).map((name) => ({ target, path: path.join(outputs[target] ?? target, name), changed: null })))
          : writeOutputs(result);
        return json(res, 200, { id: result.id, chain: result.chain, tokens: result.tokens, warnings: result.warnings, files, dry });
      } catch (error) {
        return json(res, 422, { problems: error.problems ?? [explain(error, skipped)] });
      } finally {
        building = false;
      }
    }
    return json(res, 404, { problems: [`no such endpoint: ${req.method} ${url.pathname}`] });
  }

  function asset(res, pathname) {
    const relative = path.normalize(decodeURIComponent(pathname)).replace(/^([/\\])+/, '');
    const target = path.join(root, relative || 'index.html');
    if (!target.startsWith(root + path.sep)) return json(res, 403, { problems: ['outside the app'] });
    const found = fs.existsSync(target) && fs.statSync(target).isFile() ? target : path.join(root, 'index.html');
    res.writeHead(200, {
      'content-type': MIME[path.extname(found)] ?? 'application/octet-stream',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'no-referrer',
      // The app talks to this origin only.
      'content-security-policy': "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'",
    });
    fs.createReadStream(found).pipe(res);
    return undefined;
  }

  const server = http.createServer(async (req, res) => {
    try {
      // DNS rebinding: a hostile page can point its own hostname at 127.0.0.1, but it cannot forge Host.
      if (req.headers.host !== new URL(origin).host) return json(res, 421, { problems: ['unexpected Host'] });
      if (req.headers.origin && req.headers.origin !== origin) return json(res, 403, { problems: ['unexpected Origin'] });
      const url = new URL(req.url, origin);
      if (url.pathname.startsWith('/api/')) {
        const answered = await api(req, res, url);
        // A request refused before its body was read (401, 404, 429…): read it out, so the connection stays usable.
        if (!req.readableEnded) req.resume();
        return answered;
      }
      if (req.method !== 'GET' && req.method !== 'HEAD') return json(res, 405, { problems: ['method not allowed'] });
      return asset(res, url.pathname);
    } catch (error) {
      return json(res, error.status ?? (error instanceof SyntaxError ? 400 : 500), { problems: [error instanceof SyntaxError ? `not JSON: ${error.message}` : error.message] });
    }
  });

  await new Promise((resolve, reject) => server.once('error', reject).listen(port, '127.0.0.1', resolve));
  const bound = server.address().port;
  origin = `http://127.0.0.1:${bound}`;
  return {
    url: `${origin}/#token=${token}`,
    port: bound,
    token,
    close: () => new Promise((resolve) => { watcher.close(); clearTimeout(parentsTimer); for (const res of listeners) res.end(); server.close(() => resolve()); server.closeAllConnections?.(); }),
  };
}

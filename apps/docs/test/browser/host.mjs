// The site as the host serves it, for the browser tests: the files of `dist/` on a free port, each with the response
// headers `dist/_headers` gives its path (public/_headers), read as Cloudflare Pages reads them. A test that served the
// files without them could not see what those headers refuse: the gallery's windows were framed by a page whose header
// said `X-Frame-Options: DENY` to every document, and drew nothing on the site while every test here was green.
//
// How the host reads the file (https://developers.cloudflare.com/pages/configuration/headers/, and the asset worker of
// workers-sdk, whose `attachCustomHeaders` this follows): a line that does not start with white space is a path, and the
// indented lines below it are its headers, `Name: value`, or `! Name` to detach a header a rule above set. Every rule
// whose path matches is applied, in the file's order: its detached headers are removed, then each of its headers is set,
// or joined to the value a rule above set (`, `). `*` in a path matches anything, `:name` one segment.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import zlib from 'node:zlib';

const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.txt': 'text/plain', '.xml': 'application/xml', '.wasm': 'application/wasm' };

/**
 * The rules of a `_headers` file, in its order.
 * @param {string} text
 * @returns {{ path: string, match: RegExp, set: Record<string, string>, unset: string[] }[]}
 */
export function headerRules(text) {
  const rules = [];
  let rule;
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    if (!/^\s/.test(line)) {
      const pattern = trimmed.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/:[A-Za-z]\w*/g, '[^/]+');
      rule = { path: trimmed, match: new RegExp(`^${pattern}$`), set: {}, unset: [] };
      rules.push(rule);
      continue;
    }
    if (!rule) throw new Error(`_headers: a header before any path: ${trimmed}`);
    if (trimmed.startsWith('! ')) {
      rule.unset.push(trimmed.slice(2).trim().toLowerCase());
      continue;
    }
    const at = trimmed.indexOf(':');
    if (at < 1) throw new Error(`_headers: not a header: ${trimmed}`);
    const name = trimmed.slice(0, at).trim().toLowerCase();
    const value = trimmed.slice(at + 1).trim();
    rule.set[name] = rule.set[name] ? `${rule.set[name]}, ${value}` : value;
  }
  return rules;
}

/**
 * The headers the host sends with a path, by their lower-case names.
 * @param {ReturnType<typeof headerRules>} rules
 * @param {string} pathname
 * @returns {Record<string, string>}
 */
export function headersFor(rules, pathname) {
  const headers = {};
  for (const rule of rules) {
    if (!rule.match.test(pathname)) continue;
    for (const name of rule.unset) delete headers[name];
    for (const [name, value] of Object.entries(rule.set)) headers[name] = headers[name] === undefined ? value : `${headers[name]}, ${value}`;
  }
  return headers;
}

// WebKit is not sent Cross-Origin-Opener-Policy. Every page of the site is sent `Cross-Origin-Opener-Policy:
// same-origin` (public/_headers), so WebKit moves the first navigation of each new page, from its about:blank, into a
// new browsing context group and a new web process (a provisional page). Now and then Playwright's WebKit (26.6, WPE)
// cancels that provisional load ("Load request cancelled") and issues the request again in the old process, which never
// commits it: the host answers the document in full, the page stays at about:blank, and `goto` waits out its 30 s for a
// load that never comes (WebKit bug 327297, open). Measured in the CI image (its arm64 build, 2 CPUs, beside a busy
// container), each page opened in a new context, two at a time, beside the docs' second shard in the three engines:
// with the policy, every one of 1716 navigations made a provisional page, 3 of them had it cancelled so, and those 3
// were the 3 that timed out (the protocol: the provisional target made, its load cancelled, the request sent again
// from the old target, and no response to it ever reached the page); without it, side by side, none of 1803 made a
// provisional page and none timed out. No test here is about the policy in a browser (Firefox is told to ignore it too,
// test/browser/launch.mjs; the CSP test reads the headers the host sends), and the other engines are sent it.
// The engine is told by its user agent: Playwright's WebKit names AppleWebKit and no Chrome.

/** Whether a request comes from WebKit (not Chromium, whose user agent names AppleWebKit too). */
export const fromWebKit = (userAgent = '') => /AppleWebKit\//.test(userAgent) && !/(Chrome|Chromium|HeadlessChrome)\//.test(userAgent);

/**
 * The headers sent with a response to a request with this user agent: all of them, but Cross-Origin-Opener-Policy for
 * WebKit (above).
 * @param {Record<string, string>} headers
 * @param {string} [userAgent]
 */
export function headersSentTo(headers, userAgent) {
  if (!fromWebKit(userAgent)) return headers;
  const { 'cross-origin-opener-policy': _, ...rest } = headers;
  return rest;
}

/**
 * Serve `dist` on a free port of 127.0.0.1 with the headers of its `_headers`. Strict-Transport-Security is left out: it
 * means nothing on http://. Cross-Origin-Opener-Policy is left out for WebKit (above). With `brotli`, a text response is
 * compressed for a browser that asks for it, as the host's are.
 * @param {string} dist
 * @param {{ brotli?: boolean }} [options]
 * @returns {Promise<{ origin: string, close: () => Promise<void> }>}
 */
export async function serveDist(dist, { brotli = false } = {}) {
  const rules = headerRules(fs.readFileSync(path.join(dist, '_headers'), 'utf8'));
  const packed = new Map();
  const server = http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    let file = path.join(dist, pathname);
    if (!file.startsWith(dist)) return response.writeHead(403).end();
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file)) return response.writeHead(404).end();
    const { 'strict-transport-security': _, ...headers } = headersSentTo(headersFor(rules, pathname), request.headers['user-agent']);
    const type = TYPES[path.extname(file)] ?? 'application/octet-stream';
    if (brotli && /^(text\/|application\/(json|xml)|image\/svg)/.test(type) && /\bbr\b/.test(request.headers['accept-encoding'] ?? '')) {
      if (!packed.has(file)) packed.set(file, zlib.brotliCompressSync(fs.readFileSync(file), { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 5 } }));
      return response.writeHead(200, { ...headers, 'content-type': type, 'content-encoding': 'br' }).end(packed.get(file));
    }
    response.writeHead(200, { ...headers, 'content-type': type });
    fs.createReadStream(file).pipe(response);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return {
    origin: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
}

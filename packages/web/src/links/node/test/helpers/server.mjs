// The tests' server: TLS on 127.0.0.1, on a port of its own, answering for the made-up names of the tests. It is
// reached only through the seam `seam()` returns — the production fetcher refuses 127.0.0.1 (seam.test.mjs).
import fs from 'node:fs';
import https from 'node:https';
import path from 'node:path';
import { after } from 'node:test';
import { leavesNothingBehind, tempDir } from '../../../../../../tools/src/test-tmp.js';
import { selfSigned } from './certificate.mjs';
import { fetcher } from './module.mjs';

export const NAMES = ['site.test', 'www.site.test', 'other.test', 'short.test', 'pictures.test', 'a.test', 'b.test', 'c.test', 'd.test', 'e.test', 'f.test'];
/** An address that is public, and that no test ever connects to: the seam's `route` leads to the server instead. */
export const PUBLIC = '93.184.216.34';

/**
 * Starts a server. `routes` maps `host/path` (or `/path` for every host) to a handler `(request, response, seen)` or
 * to `{ status, headers, body }`. It records what it was asked: `requests` (host, url, method, headers), and how many
 * requests were open at once, in all and for each host.
 */
export async function serve(routes = {}, { certificate = selfSigned(NAMES) } = {}) {
  const requests = [];
  const open = { now: 0, most: 0, hosts: new Map(), mostForOneHost: 0 };
  const sockets = new Set();
  const server = https.createServer({ key: certificate.key, cert: certificate.cert }, (request, response) => {
    const host = String(request.headers.host ?? '');
    const seen = { host, url: request.url, method: request.method, headers: { ...request.headers }, rawHeaders: [...request.rawHeaders], sni: request.socket.servername };
    requests.push(seen);
    open.now += 1;
    open.most = Math.max(open.most, open.now);
    open.hosts.set(host, (open.hosts.get(host) ?? 0) + 1);
    open.mostForOneHost = Math.max(open.mostForOneHost, open.hosts.get(host));
    response.on('close', () => {
      open.now -= 1;
      open.hosts.set(host, open.hosts.get(host) - 1);
    });
    const pathname = new URL(request.url, 'https://x.test').pathname;
    const route = routes[`${host}${pathname}`] ?? routes[pathname];
    if (!route) {
      response.writeHead(404, { 'content-type': 'text/plain' }).end('not found');
    } else if (typeof route === 'function') {
      route(request, response, seen);
    } else {
      response.writeHead(route.status ?? 200, route.headers ?? { 'content-type': 'text/html; charset=utf-8' }).end(route.body ?? '');
    }
  });
  server.on('connection', (socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const routed = [];
  const resolved = [];
  return {
    port,
    routes,
    requests,
    open,
    /** Every address the fetcher asked to be connected to — the address it had checked. */
    routed,
    /** Every name the fetcher resolved, in order. */
    resolved,
    /**
     * The fetcher's seam for this server. `resolve` (optional) answers for a name as the test says; by default every
     * name has one public address. The check of an address is the production's own unless a test replaces it.
     */
    seam(overrides = {}) {
      const answer = overrides.resolve ?? (() => [{ address: PUBLIC, family: 4 }]);
      return {
        ...fetcher.PRODUCTION,
        ca: certificate.cert,
        now: () => new Date('2026-10-07T09:00:00Z'),
        ...overrides,
        resolve: async (host) => {
          resolved.push(host);
          return answer(host, resolved.filter((name) => name === host).length);
        },
        route: (address) => {
          routed.push(address);
          return { address: '127.0.0.1', family: 4, port };
        },
      };
    },
    async close() {
      for (const socket of sockets) socket.destroy();
      await new Promise((resolve) => server.close(resolve));
    },
  };
}

/** Reads one address as link data through a server's seam, in a directory of the test's own. */
export async function ask(t, server, href, more = {}, seam = {}) {
  const { links } = await import('./module.mjs');
  const given = optionsIn(scratch(t), more);
  const result = await links.resolveLinkDataWith(href, given.options, server.seam(seam));
  return { result, ...given };
}

/** A page whose head holds `head`. */
export const page = (head, body = '<p>body</p>') => ({ body: `<!doctype html><html><head>${head}</head><body>${body}</body></html>` });

// Every test file that imports this helper fails if a directory it made is still there when its tests have ended.
leavesNothingBehind(after);

/** A directory of the test's own, removed when the test ends (and, whatever happens to the test, when its file does). */
export function scratch(t) {
  const directory = tempDir('links-test');
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return directory;
}

/** Options for a test: a lock file and a picture directory in `directory`, and a report that keeps its lines. */
export function optionsIn(directory, more = {}) {
  const said = [];
  return {
    said,
    options: { site: ['https://docs.test'], lock: path.join(directory, 'link-data.lock.json'), pictureDirectory: path.join(directory, 'pictures'), mode: 'update', report: (message) => said.push(message), ...more },
  };
}

// The one fetcher of the links helper (REQUIREMENTS.md, LKD-3 to LKD-13): every page, picture and icon is read
// through readAddress(), and nothing else in the module opens a connection.
import dns from 'node:dns';
import https from 'node:https';
import net from 'node:net';
import zlib from 'node:zlib';
import { hostMatches, isPublicAddress, readableAddress, withoutWww } from './address.js';

/** Times are milliseconds, sizes bytes, `pixels` a side, the text limits characters as a reader counts them. */
export const DEFAULT_LIMITS = Object.freeze({
  time: 10_000,
  request: 5_000,
  markup: 512 * 1024,
  picture: 5 * 1024 * 1024,
  icon: 256_000,
  pixels: 4096,
  redirects: 3,
  title: 200,
  description: 300,
  siteName: 60,
});

/** LKD-10: at most this many addresses are being read at once, and one per host. Not options. */
export const AT_ONCE = 4;
export const AT_ONCE_PER_HOST = 1;

/**
 * What the fetcher asks of the machine it runs on. This is the module's only seam, and it is not an option: the
 * public functions (index.js) always pass PRODUCTION, validate their options and refuse a key they do not know, and
 * the package's `exports` name index.js alone — so no specifier a product can write reaches a function that takes
 * another. The module's own tests import the files beside this one by path and pass a seam of their own, to reach a
 * server on the machine itself: `resolve` answers for names that do not exist, `route` sends the connection to that
 * server whatever address was checked, `ca` trusts the certificate the test made.
 *
 * - resolve(host): every address the name resolves to. Asked once for each request (LKD-6).
 * - isPublic(address): LKD-5.
 * - route(address, family): where the connection goes — the address that was checked, on the scheme's own port.
 * - ca: the certificate authorities, or undefined for the platform's own. There is no entry that turns the
 *   verification off (LKD-7).
 * - now(): the day a thing was read.
 */
export const PRODUCTION = Object.freeze({
  resolve: (host) => dns.promises.lookup(host, { all: true, verbatim: true }),
  isPublic: isPublicAddress,
  route: (address, family) => ({ address, family, port: 443 }),
  ca: undefined,
  now: () => new Date(),
});

function gate(size) {
  let active = 0;
  const waiting = [];
  return {
    /** Resolves true when it is this caller's turn, false when `within` milliseconds passed first. */
    enter(within) {
      if (active < size) {
        active += 1;
        return Promise.resolve(true);
      }
      return new Promise((resolve) => {
        const entry = { go: () => (clearTimeout(entry.timer), resolve(true)), timer: undefined };
        if (within !== undefined) {
          entry.timer = setTimeout(() => {
            waiting.splice(waiting.indexOf(entry), 1);
            resolve(false);
          }, within);
        }
        waiting.push(entry);
      });
    },
    leave() {
      const next = waiting.shift();
      if (next) next.go();
      else active -= 1;
    },
    get idle() {
      return active === 0 && waiting.length === 0;
    },
  };
}

const ALL = gate(AT_ONCE);
const HOSTS = new Map();
const gateFor = (host) => HOSTS.get(host) ?? HOSTS.set(host, gate(AT_ONCE_PER_HOST)).get(host);
const leaveHost = (host) => {
  const held = HOSTS.get(host);
  held.leave();
  if (held.idle) HOSTS.delete(host);
};

const REDIRECTS = new Set([301, 302, 303, 307, 308]);
const PAGE = /^\s*(?:text\/html|application\/xhtml\+xml)\s*(?:;|$)/i;
const ACCEPT = {
  page: 'text/html,application/xhtml+xml',
  picture: 'image/png,image/jpeg,image/gif,image/webp,image/avif',
  icon: 'image/png,image/x-icon,image/vnd.microsoft.icon,image/jpeg,image/gif,image/webp,image/avif',
};

function decoder(encoding) {
  const name = String(encoding ?? 'identity').trim().toLowerCase();
  if (name === '' || name === 'identity') return { stream: null };
  if (name === 'gzip' || name === 'x-gzip') return { stream: zlib.createGunzip() };
  if (name === 'deflate') return { stream: zlib.createInflate() };
  if (name === 'br') return { stream: zlib.createBrotliDecompress() };
  return null;
}

/**
 * One request: a name resolved once, every address it has checked, the connection made to the first of them, one GET.
 * Resolves with a redirect's Location, with the answer's bytes, or with a reason; never rejects.
 */
function one(target, want, within, env) {
  const { internals, options } = env;
  return new Promise((resolve) => {
    let settled = false;
    let request;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      request?.destroy();
      resolve(value);
    };
    const timer = setTimeout(() => finish({ reason: 'timeout' }), within);
    (async () => {
      let addresses;
      try {
        addresses = await internals.resolve(target.host);
      } catch {
        return finish({ reason: 'unreachable' });
      }
      if (settled) return undefined;
      if (!Array.isArray(addresses) || addresses.length === 0) return finish({ reason: 'unreachable' });
      // LKD-5: every address the name has, not only the one that will be used.
      if (!addresses.every((entry) => internals.isPublic(entry?.address))) return finish({ reason: 'address-private' });
      const checked = addresses[0];
      const to = internals.route(checked.address, checked.family || net.isIP(checked.address));
      // LKD-6: the socket asks this function for the host's address, and gets the one that was checked.
      const pinned = (_host, given, callback) => {
        const [settings, done] = typeof given === 'function' ? [{}, given] : [given ?? {}, callback];
        if (settings.all) done(null, [{ address: to.address, family: to.family }]);
        else done(null, to.address, to.family);
      };
      request = https.request({
        method: 'GET',
        host: target.host,
        servername: target.host,
        port: to.port,
        path: `${target.url.pathname}${target.url.search}`,
        agent: false,
        lookup: pinned,
        ca: internals.ca,
        // LKD-7: said outright, so that not even the environment's own switch turns the verification off.
        rejectUnauthorized: true,
        // LKD-10: these headers and no others. No cookie, no credential, no referrer.
        headers: {
          Host: target.host,
          'User-Agent': options.userAgent,
          Accept: ACCEPT[want.kind],
          'Accept-Encoding': 'gzip, deflate, br',
          Connection: 'close',
        },
      });
      request.on('error', () => finish({ reason: 'unreachable' }));
      request.on('response', (response) => {
        const status = response.statusCode ?? 0;
        if (REDIRECTS.has(status)) {
          const location = response.headers.location;
          response.destroy();
          return finish(typeof location === 'string' ? { redirect: location } : { reason: 'unreachable' });
        }
        if (status !== 200) return finish({ reason: 'unreachable' });
        const contentType = String(response.headers['content-type'] ?? '');
        if (want.kind === 'page' && !PAGE.test(contentType)) return finish({ reason: 'not-a-page' });
        if (want.kind !== 'page' && Number(response.headers['content-length']) > want.limit) return finish({ reason: 'too-large' });
        const decoded = decoder(response.headers['content-encoding']);
        if (!decoded) return finish({ reason: 'unreachable' });
        const body = decoded.stream ? response.pipe(decoded.stream) : response;
        const chunks = [];
        let size = 0;
        let raw = 0;
        const done = (truncated) => {
          response.destroy();
          decoded.stream?.destroy();
          // LKD-12: a page keeps what was read up to the limit; a picture that does not fit is dropped whole.
          if (truncated && want.kind !== 'page') return finish({ reason: 'too-large' });
          return finish({ contentType, bytes: Buffer.concat(chunks, size), truncated });
        };
        // What arrives is counted too, so an answer that inflates to nothing cannot be endless either.
        if (decoded.stream) {
          response.on('data', (chunk) => {
            raw += chunk.length;
            if (raw > want.limit) done(true);
          });
          response.on('error', () => finish({ reason: 'unreachable' }));
        }
        body.on('data', (chunk) => {
          if (settled) return;
          const room = want.limit - size;
          const kept = chunk.length > room ? chunk.subarray(0, room) : chunk;
          chunks.push(kept);
          size += kept.length;
          if (chunk.length > room) return done(true);
          // A page stops at the limit. A picture of exactly the limit is whole only if nothing follows it.
          if (want.kind === 'page' && size >= want.limit) return done(true);
          if (want.complete?.(chunks, size)) done(false); // LKD-13: nothing after the head is read
          return undefined;
        });
        body.on('end', () => done(false));
        body.on('error', () => finish({ reason: 'unreachable' }));
        return undefined;
      });
      request.end();
      return undefined;
    })().catch(() => finish({ reason: 'unreachable' }));
  });
}

/**
 * Reads one address under LKD-3 to LKD-12: `want` is `{ kind: 'page' | 'picture' | 'icon', limit, complete? }`.
 * Resolves `{ ok: true, url, contentType, bytes, truncated }` — `url` the address the answer finally came from — or
 * `{ ok: false, reason }`. It never rejects, and nothing a destination sent is in a reason.
 */
export async function readAddress(address, want, env) {
  const { allow, deny, redirects, limits } = env.options;
  const first = readableAddress(address, { allow, deny });
  if (!first.ok) return { ok: false, reason: 'address-refused' };
  await gateFor(first.host).enter();
  await ALL.enter();
  try {
    // LKD-11: the address's time runs from here — resolving, connecting, every redirect, reading.
    const until = performance.now() + limits.time;
    let current = first;
    for (let hop = 0; ; hop += 1) {
      const left = until - performance.now();
      if (left <= 0) return { ok: false, reason: 'timeout' };
      const elsewhere = current.host !== first.host;
      if (elsewhere && !(await gateFor(current.host).enter(left))) return { ok: false, reason: 'timeout' };
      let answer;
      try {
        answer = await one(current, want, Math.max(1, Math.min(limits.request, until - performance.now())), env);
      } finally {
        if (elsewhere) leaveHost(current.host);
      }
      if (answer.reason) return { ok: false, reason: answer.reason };
      if (answer.redirect === undefined) return { ok: true, url: current.url, contentType: answer.contentType, bytes: answer.bytes, truncated: answer.truncated };
      // LKD-8: a redirect is a new address, read by hand and held to everything the first was.
      if (hop >= limits.redirects) return { ok: false, reason: 'redirect-refused' };
      let next;
      try {
        next = new URL(answer.redirect, current.url);
      } catch {
        return { ok: false, reason: 'redirect-refused' };
      }
      const checked = readableAddress(next, { allow, deny });
      if (!checked.ok) return { ok: false, reason: 'redirect-refused' };
      // LKD-9: to another host only from a forwarder the site has listed.
      if (withoutWww(checked.host) !== withoutWww(current.host) && !hostMatches(current.host, redirects)) return { ok: false, reason: 'redirect-refused' };
      current = checked;
    }
  } catch {
    return { ok: false, reason: 'unreachable' };
  } finally {
    ALL.leave();
    leaveHost(first.host);
  }
}

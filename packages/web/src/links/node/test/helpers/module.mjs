// Where the tests find the module: the built files, which are the files a site imports (dist/links/node). The public
// entry is index.js; the files beside it are reached here by path, which no specifier of the package allows — that is
// how these tests hand the fetcher a seam of their own (fetcher.js, PRODUCTION).
//
// STAND-IN, until the pure module lands: `src/links/index.ts` (isExternal, displayHost — one rule for the element and
// the build step, LKD-2) is built by another change. While that source file is absent, this helper writes a minimal
// `dist/links/index.js` so the Node module can be loaded and tested; `dist/` is a build output and is never committed.
// Once `src/links/index.ts` exists the compiler writes the real file and this does nothing. Delete this block then.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const pkg = path.resolve(here, '../../../../..');
export const dist = path.join(pkg, 'dist/links/node');
export const source = path.join(pkg, 'src/links/node');

const STAND_IN_MARK = '// stand-in written by src/links/node/test/helpers/module.mjs';
const STAND_IN = `${STAND_IN_MARK}
const parse = (href, base) => { try { return base === undefined ? new URL(href) : new URL(href, base); } catch { return null; } };
const names = (entry, url) => {
  const given = entry.trim().toLowerCase();
  if (given.includes('://')) return parse(given)?.origin === url.origin;
  return given.startsWith('*.') ? url.hostname.endsWith(given.slice(1)) : url.hostname === given;
};
export function isExternal(href, { base, site = [], download = false } = {}) {
  if (download) return false;
  const page = base === undefined ? null : parse(base);
  const url = page ? parse(href, page.href) : parse(href);
  if (!url || !['http:', 'https:'].includes(url.protocol)) return false;
  if (page && page.origin === url.origin) return false;
  return !site.some((entry) => names(entry, url));
}
export function displayHost(href) { return parse(href)?.hostname ?? ''; }
`;

export const pureIsStandIn = !fs.existsSync(path.join(pkg, 'src/links/index.ts'));
if (!fs.existsSync(path.join(dist, 'index.js'))) throw new Error('build first: pnpm --filter @tanrei/web build (the tests run against dist/links/node)');
const pure = path.join(pkg, 'dist/links/index.js');
if (pureIsStandIn) {
  if (!fs.existsSync(pure) || fs.readFileSync(pure, 'utf8').startsWith(STAND_IN_MARK)) fs.writeFileSync(pure, STAND_IN);
} else if (fs.existsSync(pure) && fs.readFileSync(pure, 'utf8').startsWith(STAND_IN_MARK)) throw new Error('dist/links/index.js is still the tests\' stand-in: build again');

const load = (file) => import(pathToFileURL(path.join(dist, file)).href);

/** The public entry: what `@tanrei/web/links/node` is. */
export const api = await load('index.js');
/** The files beside it, by path. */
export const address = await load('address.js');
export const fetcher = await load('fetcher.js');
export const head = await load('head.js');
export const pictures = await load('pictures.js');
export const lock = await load('lock.js');
export const options = await load('options.js');
export const links = await load('links.js');
export const refresh = await load('refresh.js');
export const cli = await load('cli.js');

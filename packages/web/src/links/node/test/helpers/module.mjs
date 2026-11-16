// Where the tests find the module: the built files, which are the files a site imports (dist/links/node). The public
// entry is index.js; the files beside it are reached here by path, which no specifier of the package allows — that is
// how these tests hand the fetcher a seam of their own (fetcher.js, PRODUCTION).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const pkg = path.resolve(here, '../../../../..');
export const dist = path.join(pkg, 'dist/links/node');
export const source = path.join(pkg, 'src/links/node');

if (!fs.existsSync(path.join(dist, 'index.js'))) throw new Error('build first: pnpm --filter @tanrei/web build (the tests run against dist/links/node)');

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

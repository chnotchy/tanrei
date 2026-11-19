// The stylesheet of each look a reader can choose that is a shipped system other than the default (the theme gallery's
// examples): Theme Studio's page sheet of a layer that extends that system and changes nothing (`{ extends: "<id>" }`)
// — only what differs from the default system's sheet, which every page already holds on its root (the web package's
// tokens.css), in the same cascade layer. Applied after it, on the root, the whole page is drawn in that system, as a
// product that ships it is: `test/look-sheet.test.mjs` asks that every property the system's own sheet gives a root
// under it is the one this sheet and the default's give the root. It is the sheet a reader's own theme is drawn with
// (lib/custom-theme.ts), computed by the same function: where the site is built, not in the reader's browser.
//
// The build writes each into a file of its own, named by its contents (`look-<id>.<hash>.css` under the client build's
// assets, which the host serves as immutable: public/_headers), and the pages are given their addresses through the
// virtual module `virtual:tanrei-docs/looks` (its default export: `{ "<id>": "<address>" }`), as the sheet's worker's
// is given (lib/sheet-worker.mjs): the client's build leaves them where the rendering, which runs after it, reads them.
// Under `astro dev` the dev server serves each from an address of its own, computed when it is first asked for.
import crypto from 'node:crypto';
import { nodePageSheet, shippedLayers } from '@tanrei/studio/sheet-node';

/** The virtual module's name. */
export const LOOKS_MODULE = 'virtual:tanrei-docs/looks';
const RESOLVED = `\0${LOOKS_MODULE}`;
/** Where the client's build leaves the addresses for the rendering: a key of the process's global object. */
const FOUND = 'tanrei-docs:looks';
/** The id of the layer each sheet is computed for: a layer of no change, which names nothing a sheet holds. */
const LAYER_ID = 'look';
/** Where the dev server serves a look's sheet, under the site's base. */
const DEV_PATH = '@tanrei-docs/looks/';

/**
 * The looks a sheet draws: every shipped system that extends another, but the default — by id, in order.
 * @param {Record<string, { id: string, extends?: string }>} layers  every shipped layer, by id
 * @param {string} defaultId  the default system (the namespace)
 */
export function sheetLooks(layers, defaultId) {
  return Object.values(layers)
    .filter((layer) => layer.extends && layer.id !== defaultId)
    .map((layer) => layer.id)
    .sort();
}

/**
 * Each look's sheet, by id (`sheetLooks`), computed in Node from the repository's files.
 * @param {string} defaultId
 * @returns {Promise<Record<string, string>>}
 */
export async function lookSheets(defaultId) {
  const sheets = nodePageSheet();
  const out = {};
  for (const id of sheetLooks(shippedLayers(), defaultId)) out[id] = await sheets.pageSheet({ id: LAYER_ID, extends: id });
  return out;
}

/** The name of a look's file: its id and the first eight hexadecimal digits of the SHA-256 of its contents. */
export const lookFileName = (id, css) => `look-${id}.${crypto.createHash('sha256').update(css).digest('hex').slice(0, 8)}.css`;

/**
 * The Vite plugin that writes the sheets and serves their addresses.
 * @param {string} defaultId  the default system (the namespace)
 */
export function lookSheetsPlugin(defaultId) {
  let base = '/';
  let serving = false;
  /** The sheets, computed once (under `astro dev`, when the first is asked for). */
  let computed;
  const sheets = () => (computed ??= lookSheets(defaultId));
  const root = () => base.replace(/\/?$/, '/');
  return {
    name: 'tanrei-docs:looks',
    configResolved(config) {
      base = config.base;
      serving = config.command === 'serve';
    },
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const at = (request.url ?? '').split('?')[0];
        const prefix = `${root()}${DEV_PATH}`;
        if (!at.startsWith(prefix) || !at.endsWith('.css')) return next();
        const css = (await sheets())[at.slice(prefix.length, -'.css'.length)];
        if (css === undefined) return next();
        response.setHeader('Content-Type', 'text/css; charset=utf-8');
        response.end(css);
      });
    },
    resolveId: (id) => (id === LOOKS_MODULE ? RESOLVED : undefined),
    // Built, read when the rendering runs the module: after the client's build.
    load(id) {
      if (id !== RESOLVED) return undefined;
      if (serving) return `export default ${JSON.stringify(Object.fromEntries(sheetLooks(shippedLayers(), defaultId).map((look) => [look, `${root()}${DEV_PATH}${look}.css`])))};`;
      return `const looks = globalThis[Symbol.for(${JSON.stringify(FOUND)})];\nif (!looks) throw new Error(${JSON.stringify(`${LOOKS_MODULE}: the client's build wrote no look's sheet`)});\nexport default looks;`;
    },
    async generateBundle() {
      if (this.environment?.name !== 'client') return;
      const hrefs = {};
      for (const [look, css] of Object.entries(await sheets())) {
        const ref = this.emitFile({ type: 'asset', fileName: `${this.environment.config.build.assetsDir}/${lookFileName(look, css)}`, source: css });
        hrefs[look] = `${root()}${this.getFileName(ref)}`;
      }
      globalThis[Symbol.for(FOUND)] = hrefs;
    },
  };
}

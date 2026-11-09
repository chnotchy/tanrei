// The key of the build that computes the stylesheet of a reader's own theme (lib/custom-theme.ts): a hash of
// everything that stylesheet is computed from — the tokens, the configuration, the token engine, the build's pipeline
// and emitter, and the modules of Theme Studio's that its worker bundles, with the plugin that shapes the documents the
// worker is given, and the installed version of the one package of the registry it bundles — read once when the site
// is built. A theme's sheet is kept in the reader's browser under this key and the layer's hash: once the site is built
// from other sources, the key is another, and a sheet kept under the old one is not used (it is computed again).
//
// It reaches the page as the virtual module `virtual:tanrei-docs/sheet-key` (its default export), for the head's
// script (components/frame/ThemeProvider.astro) and lib/custom-theme.ts alike.
import crypto from 'node:crypto';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

/** The virtual module's name. */
export const SHEET_KEY_MODULE = 'virtual:tanrei-docs/sheet-key';
const RESOLVED = `\0${SHEET_KEY_MODULE}`;

/** What a theme's stylesheet is computed from, relative to the repository's root: a folder is every file in it. */
export const SHEET_SOURCES = ['tanrei.config.json', 'tokens', 'packages/token-engine/src', 'packages/tokens-build/src', 'packages/studio/vite-plugin.js', 'packages/studio/src/model.js', 'packages/studio/src/sheet.js', 'packages/studio/src/sheet-sources.js', 'packages/studio/src/sheet-data.ts', 'packages/studio/src/sheet-answer.js', 'packages/studio/src/sheet-worker.ts'];

/**
 * The packages of the registry the worker bundles, resolved from the Studio's package as its bundler resolves them: a
 * sheet is computed with their code, so their installed version is part of the key (packages/studio/vite-plugin.js
 * imports Hct and TonalPalette from material-color-utilities; nothing else of the registry reaches the worker).
 */
export const SHEET_PACKAGES = ['@material/material-color-utilities'];

/**
 * The installed version of each of SHEET_PACKAGES, by name, as `packages/studio` under `repoRoot` resolves it.
 * @param {string} repoRoot
 * @returns {Record<string, string>}
 */
export function packageVersions(repoRoot) {
  const require = createRequire(path.join(repoRoot, 'packages/studio/package.json'));
  return Object.fromEntries(
    SHEET_PACKAGES.map((name) => {
      // The package's own package.json, found up from its entry (its `exports` may not name the file).
      let dir = path.dirname(require.resolve(name));
      while (!fs.existsSync(path.join(dir, 'package.json')) || JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')).name !== name) {
        if (path.dirname(dir) === dir) throw new Error(`${SHEET_KEY_MODULE}: no package.json of ${name} above its entry`);
        dir = path.dirname(dir);
      }
      return [name, JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')).version];
    }),
  );
}

/** Every file of `rel` (a file, or a folder and everything in it), relative to `root`, in a fixed order. */
function filesOf(root, rel) {
  const at = path.join(root, rel);
  if (!fs.existsSync(at)) throw new Error(`${SHEET_KEY_MODULE}: ${rel} is not in the repository; say in src/lib/sheet-key.mjs what a theme's stylesheet is computed from`);
  if (fs.statSync(at).isFile()) return [rel];
  return fs
    .readdirSync(at, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.relative(root, path.join(entry.parentPath, entry.name)).split(path.sep).join('/'))
    .sort();
}

/**
 * The key: the first sixteen hexadecimal digits of the SHA-256 of each source's path and contents, in order, then of
 * each bundled package's name and version.
 * @param {string} repoRoot
 * @param {Record<string, string>} [versions] the versions of SHEET_PACKAGES (`packageVersions`, read from `repoRoot`)
 * @returns {string}
 */
export function sheetKeyOf(repoRoot, versions = packageVersions(repoRoot)) {
  const hash = crypto.createHash('sha256');
  for (const rel of SHEET_SOURCES.flatMap((source) => filesOf(repoRoot, source))) {
    hash.update(`${rel}\n`);
    hash.update(fs.readFileSync(path.join(repoRoot, rel)));
    hash.update('\n');
  }
  for (const name of SHEET_PACKAGES) hash.update(`npm:${name}@${versions[name]}\n`);
  return hash.digest('hex').slice(0, 16);
}

/**
 * The Vite plugin that serves the key, read once.
 * @param {string} repoRoot
 */
export function sheetKeyPlugin(repoRoot) {
  let key;
  return {
    name: 'tanrei-docs:sheet-key',
    resolveId: (id) => (id === SHEET_KEY_MODULE ? RESOLVED : undefined),
    load: (id) => (id === RESOLVED ? `export default ${JSON.stringify((key ??= sheetKeyOf(repoRoot)))};` : undefined),
  };
}

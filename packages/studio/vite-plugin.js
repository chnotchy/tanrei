// What a Vite host (the docs site, the standalone app) needs to bundle the Studio:
//
// 1. The Studio previews with the build's own CSS emitter and invariants (@tanrei/tokens-build/emit/css and
//    /invariants). Those modules import only pure helpers and the JSON config, so they bundle as they are.
// 2. The layer schema is compiled to a validator at build time (Ajv standalone). `tanrei studio` serves the app
//    under a Content-Security-Policy without 'unsafe-eval', and Ajv's runtime compiler needs `new Function`.
// 3. material-color-utilities' Hct and TonalPalette, from their own modules (`virtual:tanrei-studio/hct`): the
//    package's entry imports every scheme and the quantizers too, and a bundler keeps them all.
// 4. The page sheet's worker (src/sheet-data.ts) imports the token documents without their prose (`?tanrei-sheet`)
//    and every shipped layer as its index (`?tanrei-sheet-index`): src/sheet-sources.js. The layers of the default
//    system's chain, which every sheet is computed against, are bundled into it; any other layer is a module of its
//    own, loaded when a chain needs it (`virtual:tanrei-studio/sheet-layers`).
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONFIG } from '@tanrei/tokens-build/config';
import { ROOT_SYSTEM, layerChain } from '@tanrei/tokens-build/layers';
import { INDEX_QUERY, SHEET_QUERY, layerIndex, withoutProse } from './src/sheet-sources.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const schemaFile = path.resolve(here, '../../tokens/schema/system.schema.json');
const systemsDir = path.resolve(here, '../../tokens/systems');
const VALIDATOR = 'virtual:tanrei-studio/validate-layer';
const HCT = 'virtual:tanrei-studio/hct';
const SHEET_LAYERS = 'virtual:tanrei-studio/sheet-layers';
/** A JSON file imported with `query`: its id, with nothing after the query. */
const queried = (id, query) => id.endsWith(`.json?${query}`);
const systemFile = (id) => path.join(systemsDir, `${id}.system.json`);

export function tanreiStudio() {
  const require = createRequire(import.meta.url);
  return {
    name: 'tanrei-studio',
    enforce: 'pre',
    resolveId(source) {
      if (source === VALIDATOR) return `\0${VALIDATOR}`;
      if (source === HCT) return `\0${HCT}`;
      if (source === SHEET_LAYERS) return `\0${SHEET_LAYERS}`;
      return null;
    },
    // A JSON file with a query is no JSON module to the bundler: it is made a module here, its data parsed at once
    // from one string (`JSON.parse`), which an engine reads faster than the same data as an object literal.
    transform(code, id) {
      const shaped = queried(id, SHEET_QUERY) ? withoutProse(JSON.parse(code)) : queried(id, INDEX_QUERY) ? layerIndex(JSON.parse(code)) : undefined;
      if (shaped === undefined) return null;
      return { code: `export default /* @__PURE__ */ JSON.parse(${JSON.stringify(JSON.stringify(shaped))});\n`, map: null, moduleType: 'js' };
    },
    load(id) {
      if (id === `\0${HCT}`) {
        const root = path.dirname(require.resolve('@material/material-color-utilities'));
        return `export { Hct } from ${JSON.stringify(path.join(root, 'hct/hct.js'))};\nexport { TonalPalette } from ${JSON.stringify(path.join(root, 'palettes/tonal_palette.js'))};\n`;
      }
      if (id === `\0${SHEET_LAYERS}`) {
        // `defaultChain`: the default system — the one named like the namespace, else the root (as src/sheet.js reads
        // it) — and the layers it extends, root first, imported with the module. `loaders`: every other shipped layer,
        // by id, a module of its own.
        const read = (each) => JSON.parse(fs.readFileSync(systemFile(each), 'utf8'));
        const defaultId = fs.existsSync(systemFile(CONFIG.namespace)) ? CONFIG.namespace : ROOT_SYSTEM;
        const chain = layerChain(defaultId, read).map((layer) => layer.id);
        const others = fs.readdirSync(systemsDir).filter((name) => name.endsWith('.system.json')).map((name) => read(name.slice(0, -'.system.json'.length)).id).filter((each) => !chain.includes(each)).sort();
        for (const each of [...chain, ...others]) this.addWatchFile?.(systemFile(each));
        return [
          ...chain.map((each, i) => `import layer${i} from ${JSON.stringify(systemFile(each))};`),
          `export const defaultChain = [${chain.map((_, i) => `layer${i}`).join(', ')}];`,
          `export const loaders = {${others.map((each) => `\n  ${JSON.stringify(each)}: () => import(${JSON.stringify(systemFile(each))}).then((module) => module.default),`).join('')}\n};`,
          '',
        ].join('\n');
      }
      if (id !== `\0${VALIDATOR}`) return null;
      this.addWatchFile?.(schemaFile);
      const Ajv2020 = require('ajv/dist/2020.js');
      const standalone = require('ajv/dist/standalone');
      const ajv = new (Ajv2020.default ?? Ajv2020)({ allErrors: true, strict: false, code: { source: true, esm: true } });
      const code = (standalone.default ?? standalone)(ajv, ajv.compile(JSON.parse(fs.readFileSync(schemaFile, 'utf8'))));
      // The generated module is ESM except for its runtime helpers, which it `require`s. They are CommonJS, and a
      // dev server serves a file it did not pre-bundle as it is: `import x from '<helper>.js'` then throws at load
      // ("does not provide an export named 'default'") and the Studio never mounts. A helper that requires nothing
      // (ucs2length, the only one the layer schema needs) is inlined, wrapped as CommonJS; one that requires
      // something is imported and left to the host's CommonJS handling (a production build has it).
      const imports = [];
      const body = code.replace(/require\("(ajv\/dist\/runtime\/[^"]+)"\)\.default/g, (_, specifier) => {
        const name = `ajvRuntime${imports.length}`;
        // Resolved from this package: the host (the docs site) need not depend on ajv itself.
        const file = require.resolve(specifier);
        const source = fs.readFileSync(file, 'utf8').replace(/^\/\/# sourceMappingURL=.*$/m, '');
        imports.push(
          /\brequire\(/.test(source.replace(/\.code = '.*';$/gm, ''))
            ? `import ${name}Module from ${JSON.stringify(file)};\nconst ${name} = ${name}Module.default ?? ${name}Module;`
            : `const ${name} = (() => {\n  const module = { exports: {} };\n  const exports = module.exports;\n${source}\n  return module.exports.default ?? module.exports;\n})();`,
        );
        return name;
      });
      if (/\brequire\(/.test(body)) throw new Error('tanrei-studio: the standalone validator still contains require(); extend the rewrite in vite-plugin.js');
      return `${imports.join('\n')}\n${body.replace(/^"use strict";/, '')}`;
    },
  };
}

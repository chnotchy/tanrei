// What a Vite host (the docs site, the standalone app) needs to bundle the Studio:
//
// 1. The Studio previews with the build's own CSS emitter and invariants (@tanrei/tokens-build/emit/css and
//    /invariants). Those modules import only pure helpers and the JSON config, so they bundle as they are.
// 2. The layer schema is compiled to a validator at build time (Ajv standalone). `tanrei studio` serves the app
//    under a Content-Security-Policy without 'unsafe-eval', and Ajv's runtime compiler needs `new Function`.
// 3. material-color-utilities' Hct and TonalPalette, from their own modules (`virtual:tanrei-studio/hct`): the
//    package's entry imports every scheme and the quantizers too, and a bundler keeps them all.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const schemaFile = path.resolve(here, '../../tokens/schema/system.schema.json');
const VALIDATOR = 'virtual:tanrei-studio/validate-layer';
const HCT = 'virtual:tanrei-studio/hct';

export function tanreiStudio() {
  const require = createRequire(import.meta.url);
  return {
    name: 'tanrei-studio',
    enforce: 'pre',
    resolveId(source) {
      if (source === VALIDATOR) return `\0${VALIDATOR}`;
      if (source === HCT) return `\0${HCT}`;
      return null;
    },
    load(id) {
      if (id === `\0${HCT}`) {
        const root = path.dirname(require.resolve('@material/material-color-utilities'));
        return `export { Hct } from ${JSON.stringify(path.join(root, 'hct/hct.js'))};\nexport { TonalPalette } from ${JSON.stringify(path.join(root, 'palettes/tonal_palette.js'))};\n`;
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
